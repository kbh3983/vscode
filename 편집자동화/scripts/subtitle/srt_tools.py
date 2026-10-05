"""자막 에이전트: Cutback SRT → 싱크(S3) → 화자 나누기(S3b) → 폭 맞추기(S4) → 최종 SRT.

기준: agents/자막/AGENT.md, agents/자막/criteria.md
사용법 (프로젝트 가상환경):
    .venv/Scripts/python scripts/subtitle/srt_tools.py <프로젝트 work 폴더> [출력 SRT 이름]

입력 (work/<프로젝트>/subtitle/):
  cutback.srt     Cutback이 만든 자막 (텍스트는 바꾸지 않는다)
  sequence.json   {sequence, width, height, fps, clip, path, start}
  audio.wav       A캠 오디오 (없으면 asr_pipeline.py audio 로 만든다)
출력:
  subtitle.json   cues_original / words / cues_final
  <출력 SRT>      기본 captions_<시퀀스>_cutback.srt
  report.md       바뀐 점 요약, 확인 필요 자막
"""
import json
import os
import re
import statistics as st
import sys
import warnings

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import asr_pipeline as P  # noqa: E402

warnings.filterwarnings("ignore")

# ---- criteria.md 값 ----
SEARCH = 1.0            # 정렬 탐색 범위 ±초
MAX_SHIFT = 0.8         # 정렬된 첫 단어가 원래 자막 시작에서 이보다 멀면 정렬 실패로 봄
MIN_KEEP = 0.35         # 정렬된 길이가 원래 길이(또는 글자 수 기준 예상 길이)의 이 비율보다 짧으면 정렬 실패로 봄
SEC_PER_CHAR = 0.12     # 한국어 말 속도 기준 예상 길이 (글자당 초)
LEAD_FRAMES = 2         # 첫 단어 시작 몇 프레임 전에 자막 시작
TAIL_FRAMES = 6         # 마지막 단어 끝 몇 프레임 뒤에 자막 끝
MIN_DUR = 0.7
MIN_DUR_SHORT = 0.5     # 화자가 바뀐 짧은 자막
GAP_FRAMES = 2          # 자막 사이 최소 간격
SAFE_W = 0.8            # 세이프 영역 가로 비율
FONT_PX_1080 = 55       # Pretendard 55px @ 1920x1080
SAME_SPK = 0.40         # 목소리 코사인 유사도: 이 이상이면 같은 사람
VOICE_MIN = 0.8         # 목소리 비교 최소 길이(초)
VOICE_SPLIT_MIN = 1.5   # 자막 안에서 앞뒤 목소리를 비교할 때 양쪽 최소 길이(초). 1초 남짓은 목소리 특징이 불안정해 오판
DIFF_SPK = 0.10         # 앞뒤 목소리 유사도가 이보다 낮으면 다른 사람으로 보고 나눔
RESPONSES = {"네", "예", "아니요", "아뇨", "그렇죠", "그쵸", "우와", "와", "아", "어", "응", "오케이"}
RESP_PAUSE = 0.3        # 맞장구와 나머지 말 사이 쉼이 이보다 길면 따로 자막 (같은 사람이 "네" 하고 바로 잇는 경우 제외)


def parse_srt(path):
    with open(path, encoding="utf-8-sig") as f:
        blocks = re.split(r"\n\s*\n", f.read().strip())
    cues = []
    for b in blocks:
        lines = b.strip().splitlines()
        if len(lines) < 3 or "-->" not in lines[1]:
            continue
        a, z = [t.strip() for t in lines[1].split("-->")]
        cues.append({"n": int(lines[0]), "start": to_sec(a), "end": to_sec(z), "text": " ".join(lines[2:]).strip()})
    return cues


def to_sec(t):
    h, m, s = t.replace(",", ".").split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def srt_time(sec):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def text_width(text, font_px):
    w = 0.0
    for ch in text:
        if "가" <= ch <= "힣" or "ㄱ" <= ch <= "ㅣ":
            w += 0.95
        elif ch == " ":
            w += 0.3
        elif ch.isalnum():
            w += 0.6
        else:
            w += 0.35
    return w * font_px


# ---------------------------------------------------------------- S0 텍스트 교정
GLOSSARY = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                        "agents", "자막", "glossary.md")


def load_glossary():
    """glossary.md '## 사전' 표 → [(잘못, 바른, 상태)]. 근거에 '미적용'이 있는 항목은 뺀다."""
    rows, on = [], False
    if not os.path.exists(GLOSSARY):
        return rows
    for line in open(GLOSSARY, encoding="utf-8"):
        if line.startswith("## "):
            on = line.strip() == "## 사전"
            continue
        if not on or not line.startswith("|"):
            continue
        c = [x.strip() for x in line.strip().strip("|").split("|")]
        if len(c) < 6 or c[0] in ("잘못 인식된 말", "") or set(c[0]) <= {"-"}:
            continue
        if c[4] in ("확정", "학습 중") and "미적용" not in c[5]:
            rows.append((c[0], c[1], c[4]))
    return sorted(rows, key=lambda r: -len(r[0]))   # 긴 표현부터


def apply_glossary(cues):
    fixes = []
    for wrong, right, status in load_glossary():
        for c in cues:
            if wrong in c["text"]:
                c["text"] = c["text"].replace(wrong, right)
                fixes.append({"n": c["n"], "from": wrong, "to": right, "status": status})
    return fixes


# ---------------------------------------------------------------- S1 검사
def check(cues, duration):
    issues = []
    for a, b in zip(cues, cues[1:]):
        if b["start"] < a["start"]:
            issues.append(f"#{b['n']} 시간 역순")
        if b["start"] < a["end"] - 0.001:
            issues.append(f"#{a['n']}↔#{b['n']} 겹침")
    for c in cues:
        if not c["text"]:
            issues.append(f"#{c['n']} 빈 자막")
        if c["end"] > duration + 0.5:
            issues.append(f"#{c['n']} 시퀀스 밖")
    return issues


# ---------------------------------------------------------------- S3 싱크
def align_cues(cues, audio, off, block_max=25.0):
    """연속된 자막을 최대 block_max초 묶음으로 모아 **한 번에 순서대로** 강제 정렬한다.
    (자막마다 따로 ±1초 정렬하면 앞뒤 자막의 말소리를 끌어와 시간이 당겨짐)"""
    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
    proc = Wav2Vec2Processor.from_pretrained(P.MODEL_ALIGN)
    model = Wav2Vec2ForCTC.from_pretrained(P.MODEL_ALIGN).cuda().eval()
    vocab = proc.tokenizer.get_vocab()
    total = len(audio) / P.SR

    blocks, cur = [], []
    for c in cues:
        if cur and (c["start"] - cur[-1]["end"] > 1.0 or c["end"] - cur[0]["start"] > block_max):
            blocks.append(cur)
            cur = []
        cur.append(c)
    if cur:
        blocks.append(cur)

    for blk in blocks:
        a = max(0.0, blk[0]["start"] - off - SEARCH)
        b = min(total, blk[-1]["end"] - off + SEARCH)
        disp = [w for c in blk for w in c["text"].split()]
        clean = " ".join(re.sub(r"[^\w]", "", w) or "_" for w in disp)
        ws = P.align_text(model, proc, vocab, audio[int(a * P.SR):int(b * P.SR)], clean, a + off)
        k = 0
        for c in blk:
            n = len(c["text"].split())
            cw = ws[k:k + n]
            for w, d in zip(cw, disp[k:k + n]):
                w["text"] = d
            k += n
            ok = (cw and all(w["start"] is not None for w in cw)
                  and not all(w.get("interpolated") for w in cw)
                  # 안전장치: 원래 시간에서 너무 벗어나거나, 길이가 너무 줄면 정렬이 무너진 것 (겹친 대화 등)
                  and abs(cw[0]["start"] - c["start"]) <= MAX_SHIFT
                  and (cw[-1]["end"] - cw[0]["start"]) >= MIN_KEEP * min(c["end"] - c["start"], SEC_PER_CHAR * len(c["text"].replace(" ", ""))))
            c["words"] = cw if ok else None
            c["aligned"] = bool(ok)


# ---------------------------------------------------------------- S3b 화자
class Voice:
    def __init__(self, audio, off):
        import torch
        from speechbrain.inference.speaker import EncoderClassifier
        save = os.path.join(os.path.expanduser("~"), ".cache", "speechbrain", "spkrec-ecapa-voxceleb")
        self.enc = EncoderClassifier.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb", savedir=save,
                                                  run_opts={"device": "cuda:0"})
        self.torch, self.audio, self.off = torch, audio, off
        self.centroids = []

    def emb(self, a, b):
        x = self.audio[int((a - self.off) * P.SR):int((b - self.off) * P.SR)].copy()
        with self.torch.no_grad():
            e = self.enc.encode_batch(self.torch.from_numpy(x)[None].cuda()).squeeze().cpu().numpy()
        return e / (np.linalg.norm(e) + 1e-9)

    def build(self, spans):
        """한 사람이 길게 말한 구간들로 화자 목록(대표 목소리)을 만든다."""
        groups = []
        for a, b in spans:
            e = self.emb(a, b)
            sims = [float(e @ np.mean(g, axis=0)) for g in groups]
            if sims and max(sims) >= SAME_SPK:
                groups[int(np.argmax(sims))].append(e)
            else:
                groups.append([e])
        self.centroids = [np.mean(g, axis=0) / np.linalg.norm(np.mean(g, axis=0)) for g in groups if len(g) >= 2]

    def who(self, a, b):
        if b - a < VOICE_MIN or not self.centroids:
            return None, 0.0
        e = self.emb(a, b)
        sims = [float(e @ c) for c in self.centroids]
        k = int(np.argmax(sims))
        return k, sims[k]


def split_speakers(cue, voice):
    """한 자막 안에서 화자가 바뀌는 곳을 찾아 단어 묶음 목록으로 나눈다. 반환: [(words, 이유, 확인필요)]"""
    ws = cue["words"]
    parts = [(ws, "", False)]

    # ① 문맥: 자막 앞·뒤에 붙은 맞장구("네", "그렇죠" …)가 쉼으로 떨어져 있으면 따로
    def peel(words):
        out, reasons = [words], []
        if len(words) >= 2 and re.sub(r"[^\w]", "", words[0]["text"]) in RESPONSES \
                and words[1]["start"] - words[0]["end"] >= RESP_PAUSE:
            out = [[words[0]], words[1:]]
            reasons.append("앞 맞장구")
        last = out[-1]
        if len(last) >= 2 and re.sub(r"[^\w]", "", last[-1]["text"]) in RESPONSES \
                and last[-1]["start"] - last[-2]["end"] >= RESP_PAUSE:
            out = out[:-1] + [last[:-1], [last[-1]]]
            reasons.append("뒤 맞장구")
        return out, reasons

    pieces, reasons = peel(ws)

    # ② 목소리: 긴 부분은 앞쪽·뒤쪽 목소리를 **직접** 비교해서 확실히 다를 때만 나눈다
    #    (대표 목소리와 비교하면 같은 사람도 자세·거리에 따라 다른 사람으로 묶여 과하게 나뉨)
    result = []
    for p in pieces:
        best = None
        for k in range(1, len(p)):
            l0, l1, r0, r1 = p[0]["start"], p[k - 1]["end"], p[k]["start"], p[-1]["end"]
            if l1 - l0 < VOICE_SPLIT_MIN or r1 - r0 < VOICE_SPLIT_MIN:
                continue
            sim = float(voice.emb(l0, l1) @ voice.emb(r0, r1))
            if sim < DIFF_SPK:
                score = -sim + (r0 - l1)
                if best is None or score > best[0]:
                    best = (score, k)
        if best:   # 목소리만으로 나눈 것은 오판 가능성이 있어 확인 필요 표시
            result += [(p[:best[1]], "목소리 바뀜", True), (p[best[1]:], "목소리 바뀜", True)]
        else:
            result.append((p, "", False))
    if len(result) > 1 and reasons:
        # 맞장구로 떼어 낸 짧은 조각은 목소리로 확인할 수 없으면 확인 필요 표시
        result = [(w, r or "맞장구 분리", need or (len(w) == 1 and (w[-1]["end"] - w[0]["start"]) < VOICE_MIN))
                  for w, r, need in result]
    return result


# ---------------------------------------------------------------- S4 폭
def split_width(words, max_px, font_px):
    text = " ".join(w["text"] for w in words)
    if text_width(text, font_px) <= max_px or len(words) <= 1:
        return [words]
    best, best_score = None, None
    for k in range(1, len(words)):
        l, r = words[:k], words[k:]
        gap = r[0]["start"] - l[-1]["end"]
        lw = text_width(" ".join(w["text"] for w in l), font_px)
        rw = text_width(" ".join(w["text"] for w in r), font_px)
        balance = abs(lw - rw) / max_px
        lone = 1.0 if (len(l) == 1 or len(r) == 1) and len(words) > 2 else 0.0
        score = gap * 3 - balance - lone
        if best_score is None or score > best_score:
            best, best_score = k, score
    return split_width(words[:best], max_px, font_px) + split_width(words[best:], max_px, font_px)


# ---------------------------------------------------------------- main
def main():
    work = sys.argv[1]
    out = os.path.join(work, "subtitle")
    seq = P.load_json(os.path.join(out, "sequence.json"))
    srt_name = sys.argv[2] if len(sys.argv) > 2 else f"captions_{seq['sequence']}_cutback.srt"
    off = P.load_json(os.path.join(out, "audio.json"))["sequence_offset"]
    audio = P.read_wav(os.path.join(out, "audio.wav"))
    fps = seq["fps"]
    frame = 1 / fps
    font_px = FONT_PX_1080 * seq["height"] / 1080
    max_px = seq["width"] * SAFE_W

    cues = parse_srt(os.path.join(out, "cutback.srt"))
    cutback_raw = [dict(c) for c in cues]
    # S0 텍스트 교정: 용어 사전(glossary.md)의 확정·학습 중 항목 자동 적용
    s0 = apply_glossary(cues)
    original = [dict(c) for c in cues]
    issues = check(cues, len(audio) / P.SR + off)

    # S3 싱크
    align_cues(cues, audio, off)
    offs = [c["words"][0]["start"] - c["start"] for c in cues if c["aligned"]]
    med = st.median(offs) if offs else 0.0

    # S3b 화자: 대표 목소리 만들기 (정렬된 자막 중 1.5초 이상)
    voice = Voice(audio, off)
    voice.build([(c["words"][0]["start"], c["words"][-1]["end"]) for c in cues
                 if c["aligned"] and c["words"][-1]["end"] - c["words"][0]["start"] >= 1.5])

    final, n_spk, n_wide, unaligned = [], 0, 0, []
    for c in cues:
        if not c["aligned"]:
            unaligned.append(c["n"])
            final.append({"src": c["n"], "text": c["text"], "start": c["start"], "end": c["end"],
                          "check": "정렬 실패 — 원래 시간 유지", "words": None})
            continue
        parts = split_speakers(c, voice)
        if len(parts) > 1:
            n_spk += 1
        for words, reason, need in parts:
            spk, _ = voice.who(words[0]["start"], words[-1]["end"])
            pieces = split_width(words, max_px, font_px)
            if len(pieces) > 1:
                n_wide += 1
            for p in pieces:
                final.append({"src": c["n"], "text": " ".join(w["text"] for w in p),
                              "start": p[0]["start"] - LEAD_FRAMES * frame,
                              "end": p[-1]["end"] + TAIL_FRAMES * frame,
                              "speaker": spk, "split": reason or None,
                              "check": "화자 바뀜 확인 필요(짧아서 목소리 비교 불가)" if need else None,
                              "short": reason != "" and len(p) <= 2,
                              "words": [{"text": w["text"], "start": round(w["start"], 3), "end": round(w["end"], 3)} for w in p]})

    # 시간 정리: 프레임 맞춤, 최소 표시 시간, 겹침 방지
    snap = lambda t: round(round(t * fps) / fps, 3)
    # 순서는 Cutback 원본 그대로 둔다 (시간순 정렬 금지: 정렬 실패 자막과 정렬된 자막이 섞이면 순서가 뒤집힘).
    # 앞 자막보다 일찍 시작하는 자막은 앞 자막 끝 뒤로 민다.
    for i, f in enumerate(final):
        nxt = final[i + 1]["start"] if i + 1 < len(final) else f["end"] + 1
        prev_end = final[i - 1]["end"] if i else 0.0
        f["start"] = max(f["start"], prev_end + GAP_FRAMES * frame) if i else max(0.0, f["start"])
        min_d = MIN_DUR_SHORT if f.get("short") else MIN_DUR
        f["end"] = max(f["end"], f["start"] + min_d)
        f["end"] = min(f["end"], nxt - GAP_FRAMES * frame)
        f["end"] = max(f["end"], f["start"] + frame)
        f["start"], f["end"] = snap(f["start"]), snap(f["end"])

    data = {"sequence": seq, "font_px": round(font_px, 2), "max_px": max_px, "global_offset_median": round(med, 3),
            "cues_cutback": cutback_raw, "text_fixes": s0, "cues_original": original, "cues_final": final}
    P.save_json(os.path.join(out, "subtitle.json"), data)
    with open(os.path.join(out, srt_name), "w", encoding="utf-8") as f:
        for i, c in enumerate(final, 1):
            f.write(f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text']}\n\n")

    # 리포트
    moved = [abs(f["start"] - next(o["start"] for o in original if o["n"] == f["src"])) for f in final if f["words"]]
    checks = [f for f in final if f.get("check")]
    tc = lambda s: f"{int(s // 60):02d}:{s % 60:05.2f}"
    with open(os.path.join(out, "report.md"), "w", encoding="utf-8") as f:
        f.write(f"# 자막 리포트 — {seq['sequence']}\n\n")
        f.write(f"- Cutback 자막 {len(original)}개 → 최종 {len(final)}개\n")
        f.write(f"- 텍스트 교정(S0, 용어 사전): {len(s0)}건"
                + (" — " + ", ".join(f"#{x['n']} {x['from']}→{x['to']}" + (" (학습 중)" if x['status'] == '학습 중' else "") for x in s0) if s0 else "") + "\n")
        f.write(f"- 검사(S1): {', '.join(issues) if issues else '문제 없음'}\n")
        f.write(f"- 싱크(S3): 정렬 {len(original) - len(unaligned)}개 / 실패 {len(unaligned)}개 {unaligned or ''}, "
                f"시작 시간 어긋남 중앙값 {med:+.3f}초, 자막 시작 이동량 중앙값 {st.median(moved) if moved else 0:.2f}초\n")
        f.write(f"- 화자(S3b): 화자 바뀜으로 나눈 자막 {n_spk}개\n")
        f.write(f"- 폭(S4): 글자 {font_px:.1f}px, 한 줄 최대 {max_px:.0f}px, 폭 때문에 나눈 자막 {n_wide}개\n\n")
        f.write("## 나뉜 자막\n| 원래 # | 시간 | 결과 | 이유 |\n|---|---|---|---|\n")
        by = {}
        for x in final:
            by.setdefault(x["src"], []).append(x)
        for n, xs in by.items():
            if len(xs) > 1:
                f.write(f"| {n} | {tc(xs[0]['start'])} | {' / '.join(x['text'] for x in xs)} | {', '.join(sorted({x.get('split') or '폭' for x in xs}))} |\n")
        f.write("\n## 확인 필요\n| 시간 | 자막 | 이유 |\n|---|---|---|\n")
        for x in checks:
            f.write(f"| {tc(x['start'])} | {x['text']} | {x['check']} |\n")
    print(f"자막 {len(original)} → {len(final)}개 | 정렬 실패 {len(unaligned)} | 어긋남 중앙값 {med:+.3f}s | "
          f"화자 나눔 {n_spk} | 폭 나눔 {n_wide} | 확인 필요 {len(checks)} → {srt_name}")


if __name__ == "__main__":
    main()
