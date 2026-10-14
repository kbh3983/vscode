import json, sys
sys.path.insert(0, ".")
sys.stdout.reconfigure(encoding="utf-8")
from srt import load
S = json.load(open("shot.json", encoding="utf-8")); F = json.load(open("final.json", encoding="utf-8"))
def iv(d): return [(c["in"], c["in"] + c["e"] - c["s"], c["s"]) for c in d["audio"][0]["clips"] if c["name"] == "C0023.MP4"]
si, fi = iv(S), iv(F)
def sub(A, B):
    """A 구간들에서 B에 덮이지 않은 부분 → [(src0, src1, seq_t0)]"""
    out = []
    for a0, a1, t in A:
        segs = [(a0, a1)]
        for b0, b1, _ in B:
            ns = []
            for x0, x1 in segs:
                if b1 <= x0 or b0 >= x1: ns.append((x0, x1)); continue
                if b0 > x0: ns.append((x0, b0))
                if b1 < x1: ns.append((b1, x1))
            segs = ns
        for x0, x1 in segs:
            if x1 - x0 > 0.08: out.append((x0, x1, t + x0 - a0))
    return out
cues = load("../../포인트/자세교정_종편_모노_컷전환_색보정_샷사이즈.srt")
def said(t0, t1):
    return " / ".join(f"{n}:{x}" for n, a, b, x in cues if b > t0 + 0.1 and a < t1 - 0.1)
def fmt(t): return f"{int(t//60)}:{t%60:05.2f}"
rem = sub(si, fi); add = sub(fi, si)
print(f"== 잘라 낸 곳 {len(rem)}개 {sum(b-a for a,b,_ in rem):.1f}초 (에이전트 시퀀스 시간)")
for a, b, t in rem: print(f"  {fmt(t)} {b-a:5.2f}s  {said(t, t + b - a)[:110]}")
print(f"== 되살린 곳 {len(add)}개 {sum(b-a for a,b,_ in add):.1f}초 (최종본 시간, 원본 소스)")
for a, b, t in add: print(f"  최종 {fmt(t)} {b-a:5.2f}s  원본 {a:.2f}~{b:.2f}")
json.dump({"removed": rem, "added": add}, open("srcdiff.json", "w"), indent=0)
