"""자막 파이프라인 0~3단계: 오디오 → VAD → Whisper ASR → 단어 정렬(forced alignment).

요구사항: agents/자막/AGENT.md (1장 원칙, 2장 파이프라인)
결과 폴더: work/<프로젝트>/subtitle/

사용법 (프로젝트 가상환경):
    .venv/Scripts/python scripts/subtitle/asr_pipeline.py <프로젝트 work 폴더> [단계...]
    단계: audio vad asr align   (생략하면 전부)

  audio : sync_map.json에서 A캠 클립과 시퀀스 시작 위치를 읽어 16kHz 모노 audio.wav 추출
  vad   : silero VAD로 말소리 구간 → 문맥이 유지되는 덩어리(최대 25초)로 묶음. 오디오는 지우지 않음
  asr   : 덩어리마다 faster-whisper large-v3 (앞 덩어리 문장을 문맥 힌트로) → asr_raw.json
  align : 덩어리 텍스트를 한국어 wav2vec2(CTC)로 강제 정렬 → 단어별 실제 start/end → words_raw.json

시간은 모두 **시퀀스 기준 초** (= audio.wav 초 + A캠 시퀀스 시작 위치).
"""
import json
import os
import re
import site
import subprocess
import sys

import numpy as np

SR = 16000
MODEL_ASR = "large-v3"
MODEL_ALIGN = "kresnik/wav2vec2-large-xlsr-korean"

# VAD: 말소리를 놓치지 않는 쪽으로 느슨하게
VAD_THRESHOLD = 0.3
VAD_MIN_SILENCE_MS = 500
VAD_PAD_MS = 300
CHUNK_MAX = 25.0           # 덩어리 최대 길이 (Whisper 30초 창 안)
ASR_PAD = 0.5              # 덩어리 앞뒤로 더 붙여 듣는 여유

# 지어낸 말(환각) 검사
HALLU_COMPRESSION = 2.4
HALLU_REPEAT = re.compile(r"(.)\1{5,}")   # 같은 글자 6번 이상 (ㅋㅋㅋㅋㅋㅋ)


def add_cuda_dlls():
    for base in site.getsitepackages():
        for sub in ("cublas", "cudnn"):
            p = os.path.join(base, "nvidia", sub, "bin")
            if os.path.isdir(p):
                os.add_dll_directory(p)
                os.environ["PATH"] = p + os.pathsep + os.environ["PATH"]


def load_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save_json(p, d):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)


def read_wav(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


# ---------------------------------------------------------------- 0 audio
def stage_audio(work, out):
    """A캠(V1) 클립 오디오 추출. 입력은 둘 중 하나:
    1) subtitle/sequence.json — 에이전트가 Premiere 시퀀스에서 읽어 쓴 V1 클립 정보
       {"sequence": "v01_sync", "clip": "C0019.mp4", "path": "...", "start": 0.0}
    2) sync_map.json + probe.json — 싱크 에이전트 결과
    """
    seq_path = os.path.join(out, "sequence.json")
    if os.path.exists(seq_path):
        s = load_json(seq_path)
        path, name, start, camera = s["path"], s["clip"], s["start"], "A"
    else:
        sync = load_json(os.path.join(work, "sync_map.json"))[0]
        ref = next(c for c in sync["clips"] if c["track"].startswith("V1"))
        probe = load_json(os.path.join(work, "probe.json"))
        path = next(p["path"] for p in probe if os.path.basename(p["path"]) == ref["file"])
        name, start, camera = ref["file"], ref["timeline_start_sec"], ref["camera"]
    wav = os.path.join(out, "audio.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-vn", "-ac", "1", "-ar", str(SR), wav], check=True)
    meta = {"source": path, "camera": camera, "sequence_offset": start}
    save_json(os.path.join(out, "audio.json"), meta)
    print(f"[audio] {name} (A캠) → audio.wav, 시퀀스 시작 {start}초")


# ---------------------------------------------------------------- 1 vad
def stage_vad(out):
    import torch
    from silero_vad import load_silero_vad, get_speech_timestamps
    audio = read_wav(os.path.join(out, "audio.wav"))
    model = load_silero_vad(onnx=True)   # torch.jit은 한글 경로(편집자동화)를 못 열어 ONNX 사용
    ts = get_speech_timestamps(torch.from_numpy(audio), model, sampling_rate=SR,
                               threshold=VAD_THRESHOLD, min_silence_duration_ms=VAD_MIN_SILENCE_MS,
                               speech_pad_ms=VAD_PAD_MS, return_seconds=True)
    regions = [(t["start"], t["end"]) for t in ts]
    total = len(audio) / SR

    # 덩어리는 오디오 전체를 빈틈없이 덮는다 (VAD가 놓친 짧은 감탄사도 버리지 않기 위해).
    # VAD는 "어디서 자를지"만 정한다: 말소리 구간 사이 무음의 한가운데.
    cuts = [(a[1] + b[0]) / 2 for a, b in zip(regions, regions[1:])]
    final, start = [], 0.0
    for c in cuts + [total]:
        if final and c - final[-1][0] <= CHUNK_MAX and final[-1][1] == start:
            final[-1][1] = c          # 이어 붙여도 최대 길이 이하면 합침
        else:
            final.append([start, c])
        start = c
    # 그래도 긴 덩어리(긴 연속 발화)는 균등 분할
    split = []
    for s, e in final:
        n = max(1, int(np.ceil((e - s) / CHUNK_MAX)))
        step = (e - s) / n
        split += [[s + i * step, s + (i + 1) * step] for i in range(n)]
    final = split

    speech = sum(e - s for s, e in regions)
    save_json(os.path.join(out, "vad.json"), {
        "params": {"threshold": VAD_THRESHOLD, "min_silence_ms": VAD_MIN_SILENCE_MS, "pad_ms": VAD_PAD_MS},
        "regions": [{"start": round(s, 3), "end": round(e, 3)} for s, e in regions],
        "chunks": [{"id": i + 1, "start": round(s, 3), "end": round(e, 3)} for i, (s, e) in enumerate(final)],
    })
    print(f"[vad] 말소리 구간 {len(regions)}개 ({speech:.1f}초 / 전체 {len(audio) / SR:.1f}초) → 덩어리 {len(final)}개")


# ---------------------------------------------------------------- 2 asr
def topic_prompt(work):
    """영상 주제 힌트(work/<프로젝트>/topic.txt) + glossary 확정 단어 (짧게)."""
    terms = []
    tp = os.path.join(work, "topic.txt")
    if os.path.exists(tp):
        terms.append(open(tp, encoding="utf-8").read().strip())
    gl = os.path.join(os.path.dirname(os.path.dirname(work)), "agents", "자막", "glossary.md")
    if os.path.exists(gl):
        for line in open(gl, encoding="utf-8"):
            c = [x.strip() for x in line.strip().strip("|").split("|")]
            if len(c) >= 5 and c[4] == "확정":
                terms.append(c[0])
    return ", ".join(terms)


def stage_asr(work, out):
    add_cuda_dlls()
    from faster_whisper import WhisperModel
    audio = read_wav(os.path.join(out, "audio.wav"))
    off = load_json(os.path.join(out, "audio.json"))["sequence_offset"]
    chunks = load_json(os.path.join(out, "vad.json"))["chunks"]
    model = WhisperModel(MODEL_ASR, device="cuda", compute_type="float16")
    terms = topic_prompt(work)

    import difflib

    def run(seg_audio, prompt):
        segs, _ = model.transcribe(seg_audio, language="ko", beam_size=5, temperature=0.0,
                                   word_timestamps=True, vad_filter=False,
                                   condition_on_previous_text=False, initial_prompt=prompt)
        segs = list(segs)
        return segs, " ".join(s.text.strip() for s in segs).strip()

    results, prev_text = [], ""
    for ch in chunks:
        a = max(0.0, ch["start"] - ASR_PAD)
        b = min(len(audio) / SR, ch["end"] + ASR_PAD)
        seg_audio = audio[int(a * SR):int(b * SR)]
        prompt = " ".join(x for x in (terms, prev_text[-80:]) if x) or None
        segs, text = run(seg_audio, prompt)
        retried = False
        # 앞 덩어리 문장을 힌트로 줬더니 그대로 베낀 경우 → 힌트 없이 다시 인식
        copied = lambda t, ref, n: ref and difflib.SequenceMatcher(a=t, b=ref).find_longest_match().size >= n
        if copied(text, prev_text, 20):
            segs, text = run(seg_audio, terms or None)
            retried = True
        # 주제 힌트(용어 나열)까지 베꼈으면 힌트 없이
        if copied(text, terms, 10):
            segs, text = run(seg_audio, None)
            retried = True
        words = [{"text": w.word.strip(), "p": round(w.probability, 3),
                  "start_whisper": round(a + w.start + off, 3), "end_whisper": round(a + w.end + off, 3)}
                 for s in segs for w in (s.words or []) if w.word.strip()]
        flags = ["retried_no_prompt"] if retried else []
        # 웃음 등을 "ㅋㅋㅋ…"처럼 지어낸 부분만 지운다 (덩어리 전체를 버리면 실제 말까지 사라짐)
        junk = re.compile(r"^([ㄱ-ㅎㅏ-ㅣ])\1*$|(.)\2{5,}")
        if HALLU_REPEAT.search(text) or any(junk.search(w.word.strip()) for s in segs for w in (s.words or [])):
            flags.append("repeat_removed")
            text = " ".join(t for t in text.split() if not junk.search(t))
            for s in segs:
                s.words[:] = [w for w in (s.words or []) if not junk.search(w.word.strip())]
        if any(s.compression_ratio > HALLU_COMPRESSION for s in segs):
            flags.append("compression")
        if segs and all(s.no_speech_prob > 0.6 and s.avg_logprob < -1.0 for s in segs):
            flags.append("no_speech")
        results.append({
            "id": ch["id"], "start": round(ch["start"] + off, 3), "end": round(ch["end"] + off, 3),
            "text": text, "flags": flags,
            "avg_logprob": round(float(np.mean([s.avg_logprob for s in segs])), 3) if segs else None,
            "words": words,
        })
        if not set(flags) - {"retried_no_prompt", "repeat_removed"}:
            prev_text = text
    save_json(os.path.join(out, "asr_raw.json"), {"model": MODEL_ASR, "prompt_terms": terms, "chunks": results})
    nw = sum(len(r["words"]) for r in results)
    print(f"[asr] 덩어리 {len(results)}개, 단어 {nw}개, 힌트 없이 재인식 "
          f"{sum('retried_no_prompt' in r['flags'] for r in results)}개, "
          f"지어낸 부분 삭제 {sum('repeat_removed' in r['flags'] for r in results)}개, "
          f"환각 의심 {sum(bool(set(r['flags']) - {'retried_no_prompt', 'repeat_removed'}) for r in results)}개")


# ---------------------------------------------------------------- 3 align
def align_text(model, proc, vocab, audio_seg, text, t0):
    """text를 audio_seg에 강제 정렬 → [{text,start,end,score}] (t0 = 구간 시작 초, 시퀀스 기준)."""
    import torch
    import torchaudio.functional as F
    words = text.split()
    sep = vocab.get("|")           # 모델이 학습한 단어 경계 기호
    chars, owner = [], []          # 정렬할 글자와 그 글자가 속한 단어 번호 (-1 = 단어 경계)
    for wi, w in enumerate(words):
        if wi and sep is not None:
            chars.append(sep)
            owner.append(-1)
        for c in w:
            if c in vocab:
                chars.append(vocab[c])
                owner.append(wi)
    out = [{"text": w, "start": None, "end": None, "score": 0.0} for w in words]
    if not chars:
        return out
    with torch.inference_mode():
        # 모델이 학습된 방식대로 정규화(평균 0, 분산 1)해서 넣는다
        x = proc(audio_seg, sampling_rate=SR, return_tensors="pt").input_values.cuda()
        emis = torch.log_softmax(model(x).logits.float(), dim=-1)
    frames = emis.shape[1]
    if frames < len(chars):
        return out
    sec_per_frame = len(audio_seg) / SR / frames
    blank = proc.tokenizer.pad_token_id
    ali, scores = F.forced_align(emis.cpu(), torch.tensor([chars], dtype=torch.int32), blank=blank)
    ali, scores = ali[0].tolist(), scores[0].exp().tolist()
    # 글자별 프레임 구간
    spans, ci, prev = [], -1, blank
    for f, tok in enumerate(ali):
        if tok != blank and (tok != prev or prev == blank):
            ci += 1
            spans.append([f, f, scores[f]])
        elif tok != blank and spans:
            spans[-1][1] = f
        prev = tok
    for k, (fs, fe, _) in enumerate(spans[:len(owner)]):
        wi = owner[k]
        if wi < 0:
            continue
        s, e = t0 + fs * sec_per_frame, t0 + (fe + 1) * sec_per_frame
        if out[wi]["start"] is None:
            out[wi]["start"], out[wi]["score"] = s, []
        out[wi]["end"] = e
        out[wi]["score"].append(max(scores[fs:fe + 1]))   # 글자 구간에서 가장 확실한 프레임의 확률
    # 단어 끝이 뒤따르는 무음까지 늘어나지 않도록, 실제 소리가 끝나는 지점에서 자른다
    # (20ms 단위 소리 크기가 구간 소음 바닥 + 10dB 아래로 떨어진 뒤는 버림)
    hop = int(0.02 * SR)
    rms = np.array([np.sqrt(np.mean(audio_seg[i:i + hop] ** 2)) + 1e-9
                    for i in range(0, len(audio_seg) - hop, hop)])
    db = 20 * np.log10(rms)
    floor = np.percentile(db, 10)
    for w in out:
        if w["start"] is None:
            continue
        i0, i1 = int((w["start"] - t0) / 0.02), int((w["end"] - t0) / 0.02)
        loud = [i for i in range(i0, min(i1, len(db))) if db[i] > floor + 10]
        if loud:
            w["end"] = max(w["start"] + 0.06, t0 + (loud[-1] + 1) * 0.02)
    # 정렬할 글자가 없는 단어(숫자·영어만)는 앞뒤 단어 사이로 보간
    for i, w in enumerate(out):
        w["score"] = round(float(np.mean(w["score"])), 3) if w["score"] else 0.0
        if w["start"] is None:
            prev_end = next((out[j]["end"] for j in range(i - 1, -1, -1) if out[j]["end"] is not None), t0)
            nxt = next((out[j]["start"] for j in range(i + 1, len(out)) if out[j]["start"] is not None), prev_end)
            w["start"], w["end"], w["interpolated"] = prev_end, max(nxt, prev_end), True
        w["start"], w["end"] = round(w["start"], 3), round(w["end"], 3)
    return out


def dedupe_boundary(prev_words, words, max_overlap=6, max_gap=1.5):
    """덩어리는 앞뒤 ASR_PAD만큼 더 들어서 인식하므로, 경계의 말이 이웃 덩어리와 중복될 수 있다.
    뒷덩어리 앞부분 k개 단어가 앞덩어리 끝 k개 단어와 같은 말이고 시간도 가까우면 뒷덩어리 쪽을 뺀다.
    (시간으로 자르면 두 덩어리가 같은 단어 시간을 조금 다르게 잡아 양쪽에서 모두 빠질 수 있어 글자로 비교)"""
    if not prev_words or not words:
        return words
    import difflib
    n = lambda t: re.sub(r"[^\w]", "", t)
    for skip in range(0, 3):                      # 뒷덩어리 첫머리의 "네," 같은 1~2단어는 건너뛰고도 비교
        for k in range(min(max_overlap, len(prev_words), len(words) - skip), 0, -1):
            tw = [n(w["text"]) for w in prev_words[-k:]]
            hw = [n(w["text"]) for w in words[skip:skip + k]]
            tail, head = "".join(tw), "".join(hw)
            if not tail or abs(words[skip]["start"] - prev_words[-k]["start"]) >= max_gap:
                continue
            same = tail == head
            # 같은 소리를 조금 다르게 받아 적은 경우, 2단어 이상일 때만:
            #  - 글자가 거의 같거나 (일치율 0.7 이상)
            #  - 앞 단어들이 같고 마지막 한 단어만 다름 (예: "들 수 있어요" / "들 수 있으니까")
            common = next((i for i, (x, y) in enumerate(zip(tw, hw)) if x != y), len(hw))
            close = k >= 2 and (difflib.SequenceMatcher(a=tail, b=head).ratio() >= 0.7 or common >= k - 1)
            if same or close:
                return words[:skip] + words[skip + k:] if skip and not same else words[skip + k:]
    return words


def stage_align(out):
    import torch
    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
    audio = read_wav(os.path.join(out, "audio.wav"))
    off = load_json(os.path.join(out, "audio.json"))["sequence_offset"]
    asr_all = load_json(os.path.join(out, "asr_raw.json"))
    asr = asr_all["chunks"]
    overlap_chunks = asr_all.get("model") != "clova-speech"   # CLOVA 구간은 겹치지 않음
    proc = Wav2Vec2Processor.from_pretrained(MODEL_ALIGN)
    model = Wav2Vec2ForCTC.from_pretrained(MODEL_ALIGN).cuda().eval()
    vocab = proc.tokenizer.get_vocab()

    words = []
    for ch in asr:
        if "no_speech" in ch["flags"] or not ch["text"]:
            continue
        text = re.sub(r"[^\w\s]", "", ch["text"])
        a = max(0.0, ch["start"] - off - ASR_PAD)
        b = min(len(audio) / SR, ch["end"] - off + ASR_PAD)
        aligned = align_text(model, proc, vocab, audio[int(a * SR):int(b * SR)], text, a + off)
        prev = [w for w in words if w["chunk"] == ch["id"] - 1]
        for w in (dedupe_boundary(prev, aligned) if overlap_chunks else aligned):
            w["chunk"] = ch["id"]
            words.append(w)
    save_json(os.path.join(out, "words_raw.json"), {"aligner": MODEL_ALIGN, "words": words})
    interp = sum(1 for w in words if w.get("interpolated"))
    low = sum(1 for w in words if w["score"] < 0.3)
    print(f"[align] 단어 {len(words)}개 (보간 {interp}, 정렬 점수 0.3 미만 {low})")


def main():
    work = sys.argv[1]
    stages = sys.argv[2:] or ["audio", "vad", "asr", "align"]
    out = os.path.join(work, "subtitle")
    os.makedirs(out, exist_ok=True)
    for st in stages:
        {"audio": lambda: stage_audio(work, out), "vad": lambda: stage_vad(out),
         "asr": lambda: stage_asr(work, out), "align": lambda: stage_align(out)}[st]()


if __name__ == "__main__":
    main()
