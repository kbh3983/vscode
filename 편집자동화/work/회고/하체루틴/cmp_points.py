import json, sys
sys.stdout.reconfigure(encoding="utf-8")
F = json.load(open("final.json", encoding="utf-8"))
M = [m for m in json.load(open("timemap.json")) if m["cs"] is not None]
P = json.load(open("../../포인트/하체루틴_새_배치.json", encoding="utf-8"))["points"]
def f2c(t):
    for m in M:
        if m["fs"] <= t < m["fe"]: return m["cs"] + t - m["fs"]
    for m in M:
        if m["fs"] > t: return m["cs"] - (m["fs"] - t)
    return t
def fmt(t): return "-" if t is None else f"{int(t//60)}:{t%60:05.2f}"
def mo(c):
    for x in c["c"]:
        if x["m"] == "AE.ADBE Motion":
            d = {p[1]: p[2] for p in x["p"]}; return round(d["비율 조정"], 1), [round(v, 3) for v in d["위치"]]
    return None, None
def fields(c):
    o = {}
    for x in c["c"]:
        for p in x["p"]:
            if isinstance(p[2], str) and "textEditValue" in p[2]:
                try: o[p[1]] = json.loads(p[2])["textEditValue"].replace("\r", "/")
                except Exception: pass
    return o
fin = []
for vi in range(2, len(F["video"])):
    for c in F["video"][vi]["clips"]:
        if c["e"] - c["s"] > 60: continue
        fin.append(dict(v=vi + 1, s=c["s"], e=c["e"], cs=f2c(c["s"]), name=c["name"], mo=mo(c), f=fields(c), used=False))
print(f"== 내 구간 {len(P)}개 (후보 {sum(len(p['candidates']) for p in P)})")
kept = 0
for p in P:
    hits = [f for f in fin if abs(f["cs"] - p["start"]) < 1.5 and f["name"] in [c["template"] for c in p["candidates"]]]
    if hits:
        kept += 1
        for h in hits:
            h["used"] = True
            rank = [c["template"] for c in p["candidates"]].index(h["name"]) + 1
            dt = h["cs"] - p["start"]; dl = (h["e"] - h["s"]) - (p["end"] - p["start"])
            print(f"  남음 #{p['n']:2d} {fmt(p['start'])}→최종 {fmt(h['s'])} [{p['type']}] 후보{rank} {h['name'][:20]:20} 시작 {dt:+.2f}s 길이 {p['end']-p['start']:.1f}→{h['e']-h['s']:.1f}s V{h['v']} {h['mo']} 문구 {h['f']}")
    else:
        print(f"  삭제 #{p['n']:2d} {fmt(p['start'])} [{p['type']}] {p['text'][:34]}")
print(f"== 남은 구간 {kept}/{len(P)}")
print("== 최종에 새로 (내 후보 아님)")
for f in fin:
    if not f["used"]: print(f"  V{f['v']} 최종 {fmt(f['s'])} (원래 {fmt(f['cs'])}) {f['e']-f['s']:.1f}s {f['name'][:24]} {f['mo']} {f['f']}")
