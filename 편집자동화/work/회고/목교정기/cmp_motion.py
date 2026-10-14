"""목교정기 샷사이즈 회고 (2026-10-13) — 모션(크기·위치·회전) 비교: 편집자 원본 _종편(editor) · 내 색보정(color) · 사용자 최종(final)
같은 원본 시간(클립 가운데)으로 맞춰 찾음. 결과 motion_rows.json (최종 시간·길이·켜짐·원래 값·최종 값)"""
import json, sys, collections
sys.stdout.reconfigure(encoding="utf-8")
E = json.load(open("editor.json", encoding="utf-8")); S = json.load(open("color.json", encoding="utf-8")); F = json.load(open("final.json", encoding="utf-8"))
def comp(c, m):
    for x in c["c"]:
        if m in x["m"]: return x
def mo(c):
    x = comp(c, "AE.ADBE Motion"); d = {p[1]: p[2] for p in x["p"]}
    return (round(d["비율 조정"], 1), tuple(round(v, 3) for v in d["위치"]), round(d["회전"], 2))
def find(clips, name, t):
    for c in clips:
        if c["name"] == name and c["in"] - 1e-3 <= t <= c["in"] + c["e"] - c["s"] + 1e-3: return c
def fmt(t): return f"{int(t//60)}:{t%60:05.2f}"
out = []
for vi, lab, cam in ((1, "V2 A캠", "C0022.MP4"), (0, "V1 B캠", "20260908_B_CAM0147.MP4")):
    fc = [c for c in F["video"][vi]["clips"] if c["name"] == cam]
    sc, ec = S["video"][vi]["clips"], E["video"][vi]["clips"]
    ed, us = collections.Counter(), collections.Counter()
    for c in fc:
        mid = c["in"] + (c["e"] - c["s"]) / 2; o = find(sc, cam, mid); e = find(ec, cam, mid)
        if not o: continue
        fm, sm, em = mo(c), mo(o), mo(e) if e else None
        if em and em != sm: ed[(em, sm)] += 1
        L = c["e"] - c["s"]
        us[(sm, fm)] += L
        out.append({"cam": lab, "s": c["s"], "e": c["e"], "tc": fmt(c["s"]), "len": round(L, 2), "off": c["off"], "before": sm, "after": fm})
    print(f"===== {lab}: 최종 {len(fc)}클립, 켜진 것 {sum(1 for c in fc if not c['off'])}")
    print(" 편집자 원본 → 내 색보정에서 바뀐 모션:", sum(ed.values()), "클립")
    print(" 색보정 → 최종 (전 → 후 : 초):")
    for (a, b), t in sorted(us.items(), key=lambda x: -x[1])[:20]:
        print(f"   {'같음' if a == b else '바꿈'} {a} → {b} : {t:.1f}s")
json.dump(out, open("motion_rows.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
