"""숏폼 에이전트 — 자막 싱크 다시 맞추기 (2026-10-16)
  python sync_captions.py <숏폼 오디오 wav의 받아쓰기 json> <원래 자막 srt> <V1 컷 시각 json 또는 -> <out.srt> [keep_until초 고정 자막 json]
원인: 처음 자막 시간은 **롱폼** 받아쓰기의 단어 시간을 숏폼 시간으로 옮긴 것 → whisper 단어 시간이 쉼 근처에서 크게 틀림(최대 1.5초 이르게)
해결 (사용자가 직접 고친 목교정기_숏폼1 앞 30초와 비교해 정함):
  1. **숏폼 자체 오디오**(시퀀스에서 내보낸 wav)를 다시 받아쓴다 → 단어 시간이 실제 숏폼 소리와 맞음 (사용자 수정본과 평균 0.1초)
  2. 원래 자막 문구를 새 받아쓰기 단어에 글자 단위로 맞춰(difflib) 자막 시작 = 그 자막 첫 글자가 맞은 단어의 시작
  3. 컷 맞춤: 시작 −0.1~+0.45초 안에 영상 컷이 있으면 컷 시각으로 (사용자도 컷에서 자막을 바꿈 → 큰 차이 0.4초가 없어짐)
  2-1. 0.7초 넘게 길고 시작이 조용한 단어는 앞 쉼이 붙은 것 → 그 단어 안 첫 말소리 시작(음량, resync.speech_onsets)으로 (같은 폴더에 t_<이름>.json ↔ <이름>.wav)
  4. 끝 = 다음 자막 시작 (빈틈 없이 — 사용자 수정본과 같음, "마가 뜨면 안 되거든"), 단 다음 시작까지 3초 넘게 비면 마지막 단어 끝 + 1.5초
  5. 순서 유지: 앞 자막 시작 + 0.2초 이후. 1.6초 넘게 옮겨지면 잘못 맞은 것으로 보고 원래 시간 유지
"""
import difflib, json, re, sys

def load_srt(p):
    out = []
    for b in open(p, encoding="utf-8-sig").read().strip().split("\n\n"):
        l = b.strip().split("\n")
        if len(l) < 3: continue
        a, c = l[1].split(" --> ")
        f = lambda x: (lambda h, m, s: int(h) * 3600 + int(m) * 60 + float(s.replace(",", ".")))(*x.strip().split(":"))
        out.append(dict(s=f(a), e=f(c), text="\n".join(l[2:])))
    return out

def tc(x):
    ms = round(x * 1000); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def plain(t): return re.sub(r"<[^>]+>|[\s.,?!~…'\"‘’“”·]", "", t)

def sync(cues, words, cuts, keep_until=-1, segs=None):
    A, ai = "", []                                   # 자막 글자 → 자막 번호
    for i, c in enumerate(cues):
        p = plain(c["text"]); A += p; ai += [i] * len(p)
    B, bt, be = "", [], []                           # 받아쓰기 글자 → 단어 시작·끝
    for w in words:
        ws = w[0]
        # 0.7초 넘게 긴 단어 = 앞 쉼이 단어에 붙은 것 → 그 단어 안 마지막 말소리 시작으로 (예: "그냥" 38.66~40.38 → 약 40.0)
        if segs and w[1] - w[0] > 0.7 and not any(a <= w[0] + 0.25 < b for a, b in segs):   # 단어 시작이 조용한 곳 = 앞 쉼이 붙은 것
            on = [a for a, b in segs if w[0] + 0.25 < a < w[1] + 0.05]
            if on: ws = on[0]
        p = plain(w[2]); B += p; bt += [ws] * len(p); be += [w[1]] * len(p)
    sm = difflib.SequenceMatcher(None, A, B, autojunk=False)
    amap = {}
    for blk in sm.get_matching_blocks():
        for k in range(blk.size): amap[blk.a + k] = blk.b + k
    first = {}; last_end = {}
    for ia in range(len(A)):
        if ia in amap:
            ci = ai[ia]
            if ci not in first: first[ci] = (ia, bt[amap[ia]])
            last_end[ci] = be[amap[ia]]
    out = []; prev = -1
    for i, c in enumerate(cues):
        if c["s"] < keep_until: s = c["s"]
        elif i in first:
            k0 = next(k for k in range(len(A)) if ai[k] == i)
            s = first[i][1]
            if first[i][0] - k0 > 2: s -= 0.15 * (first[i][0] - k0) / 3   # 첫 글자들이 안 맞았으면 조금 앞당김
            if abs(s - c["s"]) > 1.6: s = c["s"]   # 받아쓰기가 다른 곳(횟수 세기 등)에 잘못 맞은 것 → 원래 시간 유지
            near = [x for x in cuts if s - 0.1 <= x <= s + 0.45]
            if near: s = near[0]
        else: s = c["s"]
        if prev >= 0: s = max(s, prev + 0.2)
        out.append(dict(s=round(s, 3), text=c["text"], s_old=round(c["s"], 3), last=last_end.get(i))); prev = s
    for i, o in enumerate(out):
        nxt = out[i + 1]["s"] if i + 1 < len(out) else None
        if i + 1 < len(out) and cues[i + 1]["s"] < keep_until and cues[i]["s"] < keep_until: o["e"] = cues[i]["e"]
        elif nxt is None: o["e"] = round(cues[-1]["e"], 3)   # 마지막 자막 끝은 원래대로 (영상 끝을 넘지 않게)
        elif o["last"] and nxt - o["last"] > 3.0: o["e"] = round(o["last"] + 1.5, 3)
        else: o["e"] = nxt
    return out

if __name__ == "__main__":
    tj, srt, cj, dst = sys.argv[1:5]
    words = [w for s in json.load(open(tj, encoding="utf-8")) for w in s["w"]]
    cuts = json.load(open(cj)) if cj != "-" else []
    keep = float(sys.argv[5]) if len(sys.argv) > 5 else -1
    cues = load_srt(srt)
    segs = None
    wav = tj.replace("t_", "", 1)[:-5] + ".wav"
    try:
        import os
        if os.path.exists(wav):
            sys.path.insert(0, os.path.dirname(__file__)); from resync import speech_onsets; segs = speech_onsets(wav)[0]
    except Exception as e: print("말소리 구간 생략", e)
    R = sync(cues, words, cuts, keep, segs)
    open(dst, "w", encoding="utf-8-sig", newline="\r\n").write("\n".join(f"{i + 1}\n{tc(r['s'])} --> {tc(r['e'])}\n{r['text']}\n" for i, r in enumerate(R)))
    mv = [abs(r["s"] - r["s_old"]) for r in R]
    print(f"{len(R)}줄  0.2초↑ 옮김 {sum(m > 0.2 for m in mv)}  0.5초↑ {sum(m > 0.5 for m in mv)}  최대 {max(mv):.2f}초")
