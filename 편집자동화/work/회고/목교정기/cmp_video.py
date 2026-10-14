import json, sys
sys.stdout.reconfigure(encoding="utf-8")
C = json.load(open("color.json", encoding="utf-8")); F = json.load(open("final.json", encoding="utf-8"))
M = json.load(open("timemap.json", encoding="utf-8"))
def f2c(t):
    for m in M:
        if m["fs"] - 1e-3 <= t < m["fe"] + 1e-3 and m["cs"] is not None: return m["cs"] + t - m["fs"]
    return None
def lum(c):
    for x in c["c"]:
        if "Lumetri" in x["m"]:
            return {p[1] + "#" + str(p[0]): p[2] for p in x["p"] if isinstance(p[2], (int, float)) and not isinstance(p[2], bool)}
    return None
def find(clips, name, src_t):
    for c in clips:
        if c["name"] == name and c["in"] - 1e-3 <= src_t <= c["in"] + c["e"] - c["s"] + 1e-3: return c
    return None
def fmt(t): return f"{int(t//60)}:{t%60:05.2f}"
for vi, lab in ((1, "V2 A캠"), (0, "V1 B캠")):
    fc, cc = F["video"][vi]["clips"], C["video"][vi]["clips"]
    print(f"===== {lab}: final {len(fc)} / color {len(cc)}")
    newoff, newon, lumchg, lumadd, lumdel = [], [], [], [], []
    for c in fc:
        if c["name"].startswith("롱폼"): continue
        mid = c["in"] + (c["e"] - c["s"]) / 2
        o = find(cc, c["name"], mid)
        if not o: print("  짝 없음", fmt(c["s"])); continue
        if c["off"] and not o["off"]: newoff.append(c)
        if not c["off"] and o["off"]: newon.append(c)
        a, b = lum(c), lum(o)
        if a and not b: lumadd.append(c)
        elif b and not a: lumdel.append(c)
        elif a and b:
            d = {k: (b[k], a[k]) for k in a if k in b and abs(a[k] - b[k]) > 1e-3}
            if d: lumchg.append((c, d))
    print(" 새로 끈 클립(→ 아래 캠 보임):", len(newoff)); [print(f"   {fmt(c['s'])}~{fmt(c['e'])} ({c['e']-c['s']:.1f}s)") for c in newoff]
    print(" 새로 켠 클립:", len(newon)); [print(f"   {fmt(c['s'])}~{fmt(c['e'])} ({c['e']-c['s']:.1f}s)") for c in newon]
    print(" Lumetri 새로 넣음:", len(lumadd)); [print(f"   {fmt(c['s'])}~{fmt(c['e'])} off={c['off']}") for c in lumadd]
    print(" Lumetri 지움:", len(lumdel)); [print(f"   {fmt(c['s'])}~{fmt(c['e'])}") for c in lumdel]
    print(" Lumetri 값 바꿈:", len(lumchg))
    for c, d in lumchg: print(f"   {fmt(c['s'])}~{fmt(c['e'])} off={c['off']}", {k.split('#')[0]: (round(v[0], 3), round(v[1], 3)) for k, v in list(d.items())[:8]})
