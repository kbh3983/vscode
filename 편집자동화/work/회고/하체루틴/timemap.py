import json, sys
sys.stdout.reconfigure(encoding="utf-8")
C = json.load(open("color2.json", encoding="utf-8")); F = json.load(open("final.json", encoding="utf-8"))
def a1(d): return [c for c in d["audio"][0]["clips"] if c["name"] == "C0029.MP4"]
ca, fa = a1(C), a1(F)
# 원본 시간 → color 시퀀스 시간
def src2color(t):
    for c in ca:
        if c["in"] - 1e-3 <= t <= c["in"] + (c["e"] - c["s"]) + 1e-3: return c["s"] + t - c["in"]
    return None
M = []   # final 구간 [fs, fe] ↔ color [cs, ce]
for c in fa:
    s0 = src2color(c["in"]); s1 = src2color(c["in"] + c["e"] - c["s"] - 0.001)
    M.append(dict(fs=c["s"], fe=c["e"], cs=s0, ce=s1, src=c["in"]))
json.dump(M, open("timemap.json", "w", encoding="utf-8"), indent=0)
# color 에서 빠진 구간
covered = sorted((m["cs"], m["ce"]) for m in M if m["cs"] is not None and m["ce"] is not None)
gaps = []; t = 0
for a, b in covered:
    if a - t > 0.05: gaps.append((t, a))
    t = max(t, b)
ce = max(c["e"] for c in ca)
if ce - t > 0.05: gaps.append((t, ce))
print("final A1", len(fa), "color A1", len(ca), "매칭 실패", sum(1 for m in M if m["cs"] is None or m["ce"] is None))
print("빠진 구간 (color 시간):")
tot = 0
for a, b in gaps: print(f"  {a:8.2f} ~ {b:8.2f}  ({b-a:5.2f}s)"); tot += b - a
print("합계", round(tot, 2))
# 시간 이동(오프셋) 변화 지점
prev = None
for m in M:
    if m["cs"] is None: continue
    off = round(m["fs"] - m["cs"], 3)
    if off != prev: print(f"  final {m['fs']:8.2f} = color {m['cs']:8.2f}  (차이 {off:+.2f})"); prev = off
