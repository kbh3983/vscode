"""6~7단계: 교정 반영 → 최종 강제 정렬 → 자막 나누기 → subtitle.json / SRT / 질문 목록.

요구사항: agents/자막/AGENT.md 1-4·2·3장
사용법 (프로젝트 가상환경):
    .venv/Scripts/python scripts/subtitle/finalize.py <프로젝트 work 폴더>

입력: subtitle/asr_raw.json (1차 인식), subtitle/corrections.json (에이전트 교정·질문)
  corrections.json 항목
    {"chunk": 2, "from": "잘 될 수 있는", "to": "자극을 줄 수 있는", "conf": "high|mid|low", "source": "...", "reason": "..."}
    from "^" = 덩어리 맨 앞에 추가, "$" = 맨 뒤에 추가 (1차 인식이 놓친 말, 후보에 근거가 있을 때만)
    {"chunk": 6, "conf": "none", "phrase": "확 꺾였죠?", "reason": "..."}  ← 고치지 않고 질문만
출력: subtitle/subtitle.json  {raw_transcript, corrected_transcript, words, subtitles, questions}
      subtitle/captions.srt, subtitle/questions.md
시간은 모두 정렬 모델이 오디오에서 찾은 값. 에이전트는 시간을 만들지 않는다.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import asr_pipeline as P  # noqa: E402

MAX_CHARS = 18        # 자막 한 줄 최대 글자 수 (공백 포함)
MAX_DUR = 5.0         # 자막 최대 표시 시간
MIN_DUR = 0.7         # 자막 최소 표시 시간
PAUSE_BREAK = 1.0     # 단어 사이 쉼이 이보다 길면 다른 문장으로 본다
END_PUNCT = re.compile(r"[.?!]$")


def apply_corrections(text, items):
    notes = []
    for c in items:
        if c["conf"] == "none":
            continue
        if c["from"] == "^":
            text = c["to"] + " " + text
        elif c["from"] == "$":
            text = text + " " + c["to"]
        elif c["from"] in text:
            text = text.replace(c["from"], c["to"], 1)
        else:
            notes.append(f"적용 실패(원문에 없음): {c['id']}")
            continue
        notes.append(c["id"])
    return re.sub(r"\s+", " ", text).strip(), notes


def text_of(ws):
    return " ".join(w["text"] for w in ws)


def split_best(ws):
    """자막 하나에 안 들어가는 단어 묶음을 가장 자연스러운 위치에서 나눈다 (재귀).
    점수: 단어 사이 쉼이 길수록, 앞뒤 길이가 비슷할수록 좋음. 한 단어만 남는 분할은 피함."""
    if len(ws) <= 1 or (len(text_of(ws)) <= MAX_CHARS and ws[-1]["end"] - ws[0]["start"] <= MAX_DUR):
        return [ws]
    best, best_score = None, None
    for k in range(1, len(ws)):
        left, right = ws[:k], ws[k:]
        gap = right[0]["start"] - left[-1]["end"]
        balance = abs(len(text_of(left)) - len(text_of(right))) / MAX_CHARS
        lone = 1.0 if (len(left) == 1 or len(right) == 1) and len(ws) > 2 else 0.0
        comma = 0.5 if left[-1]["text"].endswith(",") else 0.0
        score = gap * 3 + comma - balance - lone
        if best_score is None or score > best_score:
            best, best_score = k, score
    return split_best(ws[:best]) + split_best(ws[best:])


def segment(words):
    """최종 단어 시간으로 자막 cue를 만든다.
    1) 문장 끝(. ? !) 또는 긴 쉼(PAUSE_BREAK 이상)에서 끊어 '문장' 단위로 묶고
    2) 자막 하나에 안 들어가면 split_best로 자연스러운 위치에서 나눈다."""
    sents, cur = [], []
    for w in words:
        if cur and (END_PUNCT.search(cur[-1]["text"]) or w["start"] - cur[-1]["end"] > PAUSE_BREAK
                    or w.get("speaker") != cur[-1].get("speaker")):          # 화자가 바뀌면 다른 자막
            sents.append(cur)
            cur = []
        cur.append(w)
    if cur:
        sents.append(cur)
    cues = [part for s in sents for part in split_best(s)]

    # 한 단어짜리 자막은 같은 흐름(쉼이 짧은) 이웃과 합칠 수 있으면 합친다
    merged = []
    for c in cues:
        if (merged and (len(c) == 1 or len(merged[-1]) == 1)
                and not END_PUNCT.search(merged[-1][-1]["text"])
                and c[0].get("speaker") == merged[-1][-1].get("speaker")
                and len(text_of(merged[-1] + c)) <= MAX_CHARS + 4
                and c[0]["start"] - merged[-1][-1]["end"] <= PAUSE_BREAK):
            merged[-1] = merged[-1] + c
        else:
            merged.append(c)

    # 다음 자막이 0.3초 안에 시작하면(예: "네" 0.1초) 따로 보여 줄 시간이 없으므로 다음 자막과 합친다
    tight = []
    for c in merged:
        if tight and c[0]["start"] - tight[-1][0]["start"] < 0.3 and c[0].get("speaker") == tight[-1][0].get("speaker"):
            tight[-1] = tight[-1] + c
        else:
            tight.append(c)
    merged = tight

    out = []
    for k, c in enumerate(merged):
        start, end = c[0]["start"], c[-1]["end"]
        nxt = merged[k + 1][0]["start"] if k + 1 < len(merged) else end + MIN_DUR
        if end - start < MIN_DUR:                     # 너무 짧으면 다음 자막 시작 전까지만 늘림
            end = start + MIN_DUR
        end = max(start + 0.1, min(end, nxt - 0.02))  # 다음 자막과 겹치지 않게
        text = re.sub(r"\.$", "", text_of(c))          # 마침표 생략
        out.append({"text": text, "start": round(start, 3), "end": round(end, 3),
                    "needs_check": any(w.get("check") for w in c)})
    return out


def srt_time(sec):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    work = sys.argv[1]
    out = os.path.join(work, "subtitle")
    asr_all = P.load_json(os.path.join(out, "asr_raw.json"))
    asr = asr_all["chunks"]
    # CLOVA 구간은 서로 겹치지 않으므로 경계 중복 제거를 하지 않는다 (실제 반복 발화가 지워짐)
    overlap_chunks = asr_all.get("model") != "clova-speech"
    corr = P.load_json(os.path.join(out, "corrections.json"))
    off = P.load_json(os.path.join(out, "audio.json"))["sequence_offset"]
    audio = P.read_wav(os.path.join(out, "audio.wav"))

    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
    proc = Wav2Vec2Processor.from_pretrained(P.MODEL_ALIGN)
    model = Wav2Vec2ForCTC.from_pretrained(P.MODEL_ALIGN).cuda().eval()
    vocab = proc.tokenizer.get_vocab()

    raw_parts, corr_parts, words, notes_all = [], [], [], []
    for ch in asr:
        if "no_speech" in ch["flags"] or not ch["text"]:
            continue
        items = [c for c in corr if c["chunk"] == ch["id"]]
        text, notes = apply_corrections(ch["text"], items)
        notes_all += notes
        raw_parts.append(ch["text"])
        corr_parts.append(text)
        # 확인 필요 구간(낮은 확신 교정, 못 고친 구간)에 표시할 글자열
        checks = [c["to"] for c in items if c["conf"] in ("mid", "low") and c["from"] != "^" and c["from"] != "$"]
        checks += [c["to"] for c in items if c["conf"] in ("low", "mid") and c["from"] in ("^", "$")]
        checks += [c["phrase"] for c in items if c["conf"] == "none"]

        a = max(0.0, ch["start"] - off - P.ASR_PAD)
        b = min(len(audio) / P.SR, ch["end"] - off + P.ASR_PAD)
        align_in = re.sub(r"[^\w\s]", "", text)
        aligned = P.align_text(model, proc, vocab, audio[int(a * P.SR):int(b * P.SR)], align_in, a + off)
        display = text.split()                     # 문장 부호가 있는 표시용 단어 (정렬 단어와 1:1)
        for w, disp in zip(aligned, display):
            w["text"], w["chunk"], w["speaker"] = disp, ch["id"], ch.get("speaker")
        # 확인 필요 표시: 해당 글자열에 속한 단어
        joined = re.sub(r"[^\w]", "", text)
        for phrase in checks:
            p = re.sub(r"[^\w]", "", phrase)
            k = joined.find(p)
            if k < 0 or not p:
                continue
            pos = 0
            for w in aligned:
                n = len(re.sub(r"[^\w]", "", w["text"]))
                if pos < k + len(p) and pos + n > k:
                    w["check"] = True
                pos += n
        if overlap_chunks:                                   # Whisper 덩어리(앞뒤 여유로 겹침)만 경계 중복 제거
            prev = [w for w in words if w["chunk"] == ch["id"] - 1]
            aligned = P.dedupe_boundary(prev, aligned)
        words += aligned

    # 말한 순서(덩어리 순서·덩어리 안 순서)는 그대로 두고, 덩어리 경계에서 시간이 거꾸로 된 단어만
    # 앞 단어 끝 뒤로 민다. (시간순 정렬은 "되는데 이"를 "이 되는데"로 뒤집을 수 있어 하지 않는다)
    for a, b in zip(words, words[1:]):
        if b["start"] < a["end"]:
            b["start"] = round(a["end"], 3)
            b["end"] = round(max(b["end"], b["start"] + 0.06), 3)
    subs = segment(words)
    questions = [c for c in corr if c["conf"] in ("mid", "low", "none")]
    data = {
        "raw_transcript": " ".join(raw_parts),
        "corrected_transcript": " ".join(corr_parts),
        "words": [{"text": w["text"], "start": w["start"], "end": w["end"], "chunk": w["chunk"],
                   **({"check": True} if w.get("check") else {}), **({"interpolated": True} if w.get("interpolated") else {})}
                  for w in words],
        "subtitles": subs,
        "corrections": corr,
    }
    P.save_json(os.path.join(out, "subtitle.json"), data)
    with open(os.path.join(out, "captions.srt"), "w", encoding="utf-8") as f:
        for i, s in enumerate(subs, 1):
            f.write(f"{i}\n{srt_time(s['start'])} --> {srt_time(s['end'])}\n{s['text']}\n\n")

    def tc(sec):
        m, s = divmod(sec, 60)
        return f"{int(m):02d}:{s:05.2f}"
    with open(os.path.join(out, "questions.md"), "w", encoding="utf-8") as f:
        f.write("# 자막 확인 질문\n\n답: `맞음` / `원래`(1차 인식대로) / 바른 표기 / `모름`\n\n")
        f.write("| Q | 시간 | 1차 인식 | 현재 자막 | 확신 | 근거·이유 | 답 |\n|---|---|---|---|---|---|---|\n")
        # 시간: 5단계에서 찾은 애매한 구간 시간(candidates.json, id 번호로 연결) → 없으면 덩어리 시작
        cand_path = os.path.join(out, "candidates.json")
        cand = {re.sub(r"\D", "", r["id"]): r.get("start") for r in P.load_json(cand_path)} if os.path.exists(cand_path) else {}
        chunk_start = {ch["id"]: ch["start"] for ch in asr}
        for q, c in enumerate(questions, 1):
            st = cand.get(re.sub(r"\D", "", c["id"]))
            t = tc(st) if st is not None else f"~{tc(chunk_start[c['chunk']])}"
            raw = c.get("phrase") or (c["from"] if c["from"] not in "^$" else "(놓침)")
            now = c.get("phrase") or c["to"]
            f.write(f"| {q} | {t} | {raw} | {now} | {c['conf']} | {c.get('source', '')} {c['reason']} | |\n")

    fail = [n for n in notes_all if n.startswith("적용 실패")]
    print(f"단어 {len(words)}개, 자막 {len(subs)}개 (확인 필요 {sum(s['needs_check'] for s in subs)}개), "
          f"질문 {len(questions)}개, 교정 적용 {len(notes_all) - len(fail)}건, 실패 {fail}")


if __name__ == "__main__":
    main()
