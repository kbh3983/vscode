import json, sys
sys.path.insert(0, ".")
sys.stdout.reconfigure(encoding="utf-8")
from srt import load
S=json.load(open("color2.json",encoding="utf-8")); F=json.load(open("final.json",encoding="utf-8"))
M=[m for m in json.load(open("timemap.json")) if m["cs"] is not None]
cues=load("../../포인트/하체루틴_종편_모노_컷전환_색보정_샷사이즈.srt")
def f2c(t):
    for m in M:
        if m["fs"]<=t<m["fe"]+1e-3: return m["cs"]+t-m["fs"]
def fmt(t): return f"{int(t//60)}:{t%60:05.2f}"
def boff(d): return [(c["s"],c["e"]) for c in d["video"][1]["clips"] if c["name"]=="C0029.MP4" and c["off"]]
sb=boff(S); fb=boff(F)
ts=sum(e-s for s,e in sb); tf=sum(e-s for s,e in fb)
print(f"B캠 비율 에이전트 {ts:.1f}s/{S['end']:.0f}s = {ts/S['end']*100:.1f}% ({len(sb)}구간) → 최종 {tf:.1f}s/{F['end']:.0f}s = {tf/F['end']*100:.1f}% ({len(fb)}구간)")
def said(a,b): return " / ".join(x for n,s,e,x in cues if e>a+0.1 and s<b-0.1)[:90]
fbc=[(f2c(s),f2c(e-0.01),s,e) for s,e in fb]
def ov(a,b,L): return sum(max(0,min(b,y)-max(a,x)) for x,y in L)
print("\n== 사용자가 새로 B캠으로 (에이전트는 A캠)")
for cs,ce,s,e in fbc:
    if cs is None or ce is None: continue
    o=ov(cs,ce,sb)
    if (ce-cs)-o>0.5: print(f"  최종 {fmt(s)}~{fmt(e)} ({e-s:.1f}s, 원래 B {o:.1f}s) {said(cs,ce)}")
print("\n== 사용자가 A캠으로 되돌림 (에이전트는 B캠)")
fl=[(a,b) for a,b,_,_ in fbc if a is not None and b is not None]
for s,e in sb:
    o=ov(s,e,fl)
    if (e-s)-o>0.5: print(f"  에이전트 {fmt(s)}~{fmt(e)} ({e-s:.1f}s, 남김 {o:.1f}s) {said(s,e)}")
