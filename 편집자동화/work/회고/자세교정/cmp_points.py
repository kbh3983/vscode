import json, sys
sys.stdout.reconfigure(encoding="utf-8")
V = json.load(open("v2.json", encoding="utf-8")); F = json.load(open("final.json", encoding="utf-8"))
G = "../../포인트/guide/"
plans = json.load(open(G + "plan_one.json", encoding="utf-8")) + json.load(open(G + "plan_bul.json", encoding="utf-8"))
def a1(d): return [c for c in d["audio"][0]["clips"] if c["name"] == "C0023.MP4"]
va = a1(V)
def src_of_v(t):
    for c in va:
        if c["s"] <= t < c["e"]: return c["in"] + t - c["s"]
def final_of_src(x):
    for c in a1(F):
        if c["in"] - 1e-3 <= x <= c["in"] + c["e"] - c["s"] + 1e-3: return c["s"] + x - c["in"]
def v2f(t):
    x = src_of_v(t)
    if x is None:
        for c in va:
            if c["s"] > t: x = c["in"] - (c["s"] - t); break
    return None if x is None else final_of_src(x)
def mo(c):
    for x in c["c"]:
        if x["m"] == "AE.ADBE Motion":
            d = {p[1]: p[2] for p in x["p"]}; return round(d["비율 조정"], 1), [round(v, 3) for v in d["위치"]]
    return None, None
def txt(c):
    o = []
    for x in c["c"]:
        for p in x["p"]:
            if isinstance(p[2], str) and "textEditValue" in p[2]:
                try: o.append(json.loads(p[2])["textEditValue"].replace("\r", "/"))
                except Exception: pass
    return " / ".join(o)
def fmt(t): return "-" if t is None else f"{int(t//60)}:{t%60:05.2f}"
SKIP = ("프로필", "테두리.png", "롱폼")
mine = []
for vi in range(2, len(V["video"])):
    for c in V["video"][vi]["clips"]:
        if c["name"].startswith(SKIP) or (vi == 3 and c["e"] - c["s"] > 60): continue
        sc, pos = mo(c)
        for p in plans:
            if p["v"] == vi and abs(p["s"] - c["s"]) < 0.03: sc, pos = p["sc"], p["pos"]
        mine.append(dict(v=vi, s=c["s"], e=c["e"], name=c["name"], sc=sc, pos=pos, txt=txt(c), fs=v2f(c["s"])))
fin = []
for vi in range(2, len(F["video"])):
    for c in F["video"][vi]["clips"]:
        if c["name"].startswith(SKIP) or c["e"] - c["s"] > 60: continue
        sc, pos = mo(c); fin.append(dict(v=vi, s=c["s"], e=c["e"], name=c["name"], sc=sc, pos=pos, txt=txt(c), used=False))
kept, gone = [], []
for m in mine:
    hit = None
    if m["fs"] is not None:
        for f in fin:
            if not f["used"] and f["name"] == m["name"] and abs(f["s"] - m["fs"]) < 0.6: hit = f; break
    if hit: hit["used"] = True; kept.append((m, hit))
    else: gone.append(m)
print(f"== 내 상태(V2 + 가이드) {len(mine)}개 → 남음 {len(kept)} / 없어짐 {len(gone)} / 최종에 새로 {sum(1 for f in fin if not f['used'])}")
print("-- 남은 것 (바뀐 점)")
for m, f in kept:
    ch = []
    if abs(f["s"] - m["fs"]) > 0.05: ch.append(f"시작 {f['s']-m['fs']:+.2f}s")
    if abs((f["e"] - f["s"]) - (m["e"] - m["s"])) > 0.05: ch.append(f"길이 {m['e']-m['s']:.2f}→{f['e']-f['s']:.2f}")
    if f["sc"] != m["sc"] or f["pos"] != m["pos"]: ch.append(f"모션 {m['sc']}%{m['pos']}→{f['sc']}%{f['pos']}")
    if f["txt"] != m["txt"]: ch.append(f"문구 [{m['txt']}]→[{f['txt']}]")
    print(f"  V{f['v']+1} {fmt(f['s'])} {f['name'][:26]:26} {m['txt'][:24]:24} | {'; '.join(ch) if ch else '그대로'}")
print("-- 없어진 것")
for m in gone: print(f"  V{m['v']+1} V2 {fmt(m['s'])} (최종 {fmt(m['fs'])}) {m['e']-m['s']:.2f}s {m['name'][:28]} [{m['txt'][:30]}]")
print("-- 최종에 새로")
for f in fin:
    if not f["used"]: print(f"  V{f['v']+1} {fmt(f['s'])} {f['e']-f['s']:.2f}s {f['name'][:28]} {f['sc']}%{f['pos']} [{f['txt'][:30]}]")
