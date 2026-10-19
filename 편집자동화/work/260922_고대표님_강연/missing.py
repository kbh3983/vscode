"""가편에는 있는데 풀영상에서 빠진 구간 (A1 C0177 원본 시간 기준) → 가편 시간 + 가편 SRT 대사
  python missing.py seqs.json 가편.srt missing.json
"""
import json, re, sys

D = json.load(open(sys.argv[1], encoding="utf-8"))
SRC = "C0177.MP4"
def clips(n): return [c for c in D[n]["audio"] if c["t"] == 0 and c["name"] == SRC]

cov = sorted((c["in"], c["out"]) for c in clips("풀영상"))
def subtract(a, b):
    out = [(a, b)]
    for x, y in cov:
        nxt = []
        for p, q in out:
            if y <= p or x >= q: nxt.append((p, q)); continue
            if x > p: nxt.append((p, x))
            if y < q: nxt.append((y, q))
        out = nxt
    return out

miss = []
for c in clips("가편"):
    for p, q in subtract(c["in"], c["out"]):
        if q - p < 0.05: continue
        miss.append([c["s"] + (p - c["in"]), c["s"] + (q - c["in"]), p, q])
miss.sort()
M = []   # 0.3초 안으로 붙은 것은 합침
for m in miss:
    if M and m[0] - M[-1][1] < 0.3: M[-1][1] = m[1]; M[-1][3] = m[3]
    else: M.append(m)

def ts(t): h, m, s = t.split(":"); s, ms = s.split(","); return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000
srt = open(sys.argv[2], encoding="utf-8-sig").read().strip().split("\n\n")
S = []
for b in srt:
    L = b.strip().split("\n")
    if len(L) < 3: continue
    a, z = L[1].split(" --> "); S.append((ts(a), ts(z), " ".join(L[2:])))

out = []
for s, e, p, q in M:
    lines = [t for a, z, t in S if min(z, e) - max(a, s) > 0.5 * (z - a) or (a >= s and z <= e)]
    out.append(dict(s=round(s, 2), e=round(e, 2), dur=round(e - s, 2), src_in=round(p, 2), src_out=round(q, 2), text=" / ".join(lines)))
json.dump(out, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
tot = sum(o["dur"] for o in out)
print(len(out), "구간, 합계 %.1f초 (%.1f분)" % (tot, tot / 60))
print("1초 미만", sum(1 for o in out if o["dur"] < 1), "/ 1~5초", sum(1 for o in out if 1 <= o["dur"] < 5), "/ 5초 이상", sum(1 for o in out if o["dur"] >= 5))
