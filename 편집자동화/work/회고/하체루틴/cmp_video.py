import json, sys, collections
sys.stdout.reconfigure(encoding="utf-8")
S = json.load(open("color2.json", encoding="utf-8")); F = json.load(open("final.json", encoding="utf-8"))
C = json.load(open("shot.json", encoding="utf-8"))
def comp(c, m):
    for x in c["c"]:
        if m in x["m"]: return x
def lum(c):
    x = comp(c, "Lumetri")
    if not x: return None
    d = {}
    for p in x["p"]:
        if p[1] in ("온도", "색조", "노출", "대비", "밝은 영역", "어두운 영역", "흰색", "검정", "채도") and p[1] not in d and isinstance(p[2], (int, float)) and not isinstance(p[2], bool): d[p[1]] = round(p[2], 2)
    return d
def mo(c):
    x = comp(c, "AE.ADBE Motion"); d = {p[1]: p[2] for p in x["p"]}
    return (round(d["비율 조정"], 1), tuple(round(v, 3) for v in d["위치"]), round(d["회전"], 2))
def find(clips, name, t):
    for c in clips:
        if c["name"] == name and c["in"] - 1e-3 <= t <= c["in"] + c["e"] - c["s"] + 1e-3: return c
def fmt(t): return f"{int(t//60)}:{t%60:05.2f}"
for vi, lab, cam in ((1, "V2 A캠", "C0029.MP4"), (0, "V1 B캠", "20260908_B_CAM0156.MP4")):
    fc = [c for c in F["video"][vi]["clips"] if c["name"] == cam]; sc = S["video"][vi]["clips"]; cc = C["video"][vi]["clips"]
    newoff, newon, lchg, ladd, mchg, magent = [], [], [], [], collections.Counter(), collections.Counter()
    rows = []
    for c in fc:
        mid = c["in"] + (c["e"] - c["s"]) / 2; o = find(sc, cam, mid); p = find(cc, cam, mid)
        if not o: continue
        if c["off"] and not o["off"]: newoff.append(c)
        if not c["off"] and o["off"]: newon.append(c)
        a, b = lum(c), lum(o)
        if a and not b: ladd.append(c)
        elif a and b and any(abs(a.get(k, 0) - b.get(k, 0)) > 1e-2 for k in set(a) | set(b)): lchg.append((c, b, a))
        fm, sm, cm = mo(c), mo(o), mo(p) if p else None
        if sm != cm: magent[(cm, sm)] += 1          # 샷사이즈 에이전트가 바꾼 것
        if fm != sm: mchg[(sm, fm)] += c["e"] - c["s"]; rows.append((c, sm, fm))
    vis = lambda c: not c["off"] if vi == 1 else True
    print(f"===== {lab}: final {len(fc)}")
    print(f" 새로 끔 {len(newoff)} ({sum(c['e']-c['s'] for c in newoff):.1f}s) / 새로 켬 {len(newon)} ({sum(c['e']-c['s'] for c in newon):.1f}s)")
    for c in newoff: print(f"   끔 {fmt(c['s'])}~{fmt(c['e'])} {c['e']-c['s']:.1f}s")
    for c in newon: print(f"   켬 {fmt(c['s'])}~{fmt(c['e'])} {c['e']-c['s']:.1f}s")
    print(f" Lumetri 새로 {len(ladd)} / 값 바꿈 {len(lchg)}")
    for c, b, a in lchg[:12]: print(f"   {fmt(c['s'])} off={c['off']} {b} → {a}")
    print(" 샷사이즈 에이전트가 바꾼 모션 (색보정 → 샷사이즈):")
    for (cm, sm), n in magent.most_common(8): print(f"   {cm} → {sm} : {n}클립")
    print(" 사용자가 바꾼 모션 (샷사이즈 → 최종), 초:")
    for (sm, fm), t in mchg.most_common(12): print(f"   {sm} → {fm} : {t:.1f}s")
    json.dump([(c["s"], c["e"], c["off"], sm, fm) for c, sm, fm in rows], open(f"motion_{vi}.json", "w"), indent=0)
