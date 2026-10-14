import json, sys, re, difflib
sys.stdout.reconfigure(encoding="utf-8")
exec(open("cmp_points.py", encoding="utf-8").read().split("print(f\"== 내 구간")[0])
norm = lambda t: re.sub(r"[^가-힣0-9A-Za-z]", "", t)
used = {}
rows = []
for f in fin:
    txt = norm(" ".join(f["f"].values()))
    if not txt: continue
    best = None
    for p in P:
        if abs(f["cs"] - p["start"]) > 20: continue
        r = difflib.SequenceMatcher(None, txt, norm(p["text"])).ratio()
        if best is None or r > best[0]: best = (r, p)
    if best and best[0] >= 0.45:
        p = best[1]; used.setdefault(p["n"], []).append(f)
        tpls = [c["template"] for c in p["candidates"]]
        rank = f"후보{tpls.index(f['name'])+1}" if f["name"] in tpls else "다른 템플릿"
        rows.append((p["n"], f"#{p['n']:2d} {fmt(p['start'])} [{p['type']}] → 최종 {fmt(f['s'])} (원래 시간 {f['cs']-p['start']:+.1f}s) {rank} {f['name'][:18]} 길이 {p['end']-p['start']:.1f}→{f['e']-f['s']:.1f}s | 내 문구 \"{p['text']}\" → \"{' / '.join(f['f'].values())}\" (닮음 {best[0]:.2f})"))
for _, r in sorted(rows): print("  " + r)
print("== 쓰지 않은 내 구간")
for p in P:
    if p["n"] not in used: print(f"  #{p['n']:2d} {fmt(p['start'])} [{p['type']}] {p['text']}")
print("== 사용자가 새로 넣은 것")
for f in fin:
    if not any(f is x for v in used.values() for x in v): print(f"  V{f['v']} 최종 {fmt(f['s'])} {f['e']-f['s']:.1f}s {f['name'][:22]} {f['mo']} {f['f']}")
