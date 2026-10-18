"""숏폼 에이전트 — 새 숏폼 자막을 처음부터 숏폼 오디오 받아쓰기로 (2026-10-16, 틀어진골반_숏폼4)
  python short_subs.py <t_숏폼.json> <cuts.json> <wav> <끝 초> <out.srt> [fix.json]
- fix.json = {"split": {"<이어진 원래 줄들, ' / '로>": ["새 줄1", …]}  (resub.apply_fix — 단어는 그대로, 끊는 곳만),
              "replace": {"회전되서": "회전돼서"} (받아쓰기 철자), "key": {"<줄>": "<핵심어 또는 빈칸>"} (KEY 첫 단어가 틀릴 때, 예: 발목의 '목')}
- 첫 자막 시작 = 0초 (영상 시작부터 자막)
- 줄 나누기 = resub.chunk (공백 포함 15자, 쉼·어미·맥락), 핵심어 노랑 = build_plan.KEY 첫 단어
- 시간 = sync_captions 규칙: 시작 = 첫 단어 시작(0.7초 넘는 단어는 그 안 첫 말소리), 컷 −0.1~+0.45초면 컷, 앞 줄 +0.2초 이후
         끝 = 다음 시작 (다음까지 3초 넘게 비면 마지막 단어 끝 + 1.5초), 마지막 끝 = 영상 끝
- 영상 끝 뒤·끝에 붙는 "시청해주셔서 감사합니다" 같은 받아쓰기 환각 문장은 뺌
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from resub import chunk, MAX, apply_fix, USED
from build_plan import KEY, clean
from make_srt import tc, line
from resync import speech_onsets

HALLU = re.compile(r"시청해 ?주셔서|구독과 좋아요|감사합니다\.?$")

if __name__ == "__main__":
    tj, cj, wav, end, out = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5]
    segs = [s for s in json.load(open(tj, encoding="utf-8")) if not (HALLU.search(s["t"]) and s["s"] > end - 3)]
    cuts = json.load(open(cj)); on = speech_onsets(wav)[0]
    W, E = [], []
    for sg in segs:
        for k, w in enumerate(sg["w"]): W.append(w); E.append(k == len(sg["w"]) - 1)
    lines = chunk(W, E)
    FIX = json.load(open(sys.argv[6], encoding="utf-8")) if len(sys.argv) > 6 else {}
    lines = apply_fix(lines, FIX.get("split", {}))
    miss = [k for k in FIX.get("split", {}) if k not in USED]
    if miss: print("못 찾은 고침:", miss)
    R = []; prev = -1
    for ch in lines:
        w0 = ch[0]; s = w0[0]
        if w0[1] - w0[0] > 0.7 and not any(a <= w0[0] + 0.25 < b for a, b in on):
            o = [a for a, b in on if w0[0] + 0.25 < a < w0[1] + 0.05]
            if o: s = o[0]
        near = [x for x in cuts if s - 0.1 <= x <= s + 0.45]
        if near: s = near[0]
        if prev >= 0: s = max(s, prev + 0.2)
        else: s = 0.0
        text = clean(" ".join(x[2] for x in ch))
        for a, b in FIX.get("replace", {}).items(): text = text.replace(a, b)
        key = FIX.get("key", {}).get(text, next((k for k in KEY if k in text), ""))
        R.append(dict(s=round(s, 3), last=ch[-1][1], text=text, key=key)); prev = s
    for i, r in enumerate(R):
        if i + 1 == len(R): r["e"] = end
        elif R[i + 1]["s"] - r["last"] > 3.0: r["e"] = round(r["last"] + 1.5, 3)
        else: r["e"] = R[i + 1]["s"]
    open(out, "w", encoding="utf-8-sig", newline="\r\n").write("\n".join(f"{i + 1}\n{tc(r['s'])} --> {tc(r['e'] - 0.02)}\n{line(r['text'], r['key'])}\n" for i, r in enumerate(R)))
    L = [len(r["text"]) for r in R]
    print(out, "자막", len(R), "최대", max(L), "15자 초과", sum(l > MAX for l in L))
    for r in R: print(f"{r['s']:6.2f}-{r['e']:6.2f} {r['text']}  [{r['key']}]")
