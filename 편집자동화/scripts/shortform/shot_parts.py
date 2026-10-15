"""숏폼 에이전트 — 숏폼마다 V1 조각 목록 (카메라 구간별, A = shot_plan 결과 / B = 원래 크롭)
  python shot_parts.py <shorts json들(,로)> <cams.json> <a_segs.json> <plan.json> <out 폴더>  → <out>/<숏폼>.json
"""
import json, os, sys

FR = 30000 / 1001
def fr(t): return round(t * FR)

S = [s for p in sys.argv[1].split(",") for s in json.load(open(p, encoding="utf-8"))]
C = json.load(open(sys.argv[2], encoding="utf-8")); J = json.load(open(sys.argv[3], encoding="utf-8"))
PL = {p["id"]: p for p in json.load(open(sys.argv[4], encoding="utf-8"))}; out = sys.argv[5]; os.makedirs(out, exist_ok=True)

def a_motion(p):
    x0, y0, x1, y1 = p["win"]; k = 1035 / (y1 - y0); wx, wy = (x0 + x1) / 2, (y0 + y1) / 2
    return round(k * 100, 3), [round((540 - (wx - 960) * k) / 1080, 5), round((958.5 - (wy - 540) * k) / 1920, 5)]

for s in S:
    ln = s["longform"]; A = sorted([t for t in C[ln] if t["v"] == 2 and t["on"]], key=lambda t: t["s"])
    segs = [j for j in J if j["name"] == s["name"]]
    R = []; prev_end = 0
    for pi, pc in enumerate(s["pieces"]):
        f0, f1, t0 = fr(pc["src_in"]), fr(pc["src_out"]), fr(pc["at"])
        if abs(t0 - prev_end) <= 2: t0 = prev_end   # 조각 사이 1~2프레임 틈·겹침 없애기 (반올림 차이)
        prev_end = t0 + f1 - f0
        k = pc["crop"]["k"]; bsc, bpos = round(k * 100, 3), [round((540 + (960 - pc["crop"]["cx"]) * k) / 1080, 5), round(958.5 / 1920, 5)]
        cuts = sorted({f0, f1} | {fr(t["s"]) for t in A if f0 < fr(t["s"]) < f1} | {fr(t["e"]) for t in A if f0 < fr(t["e"]) < f1})
        cuts = [c for i, c in enumerate(cuts) if i in (0, len(cuts) - 1) or (c - cuts[i - 1] >= 3 and cuts[-1] - c >= 3)]   # 2프레임 이하 조각은 옆 조각에 붙임 (1프레임 조각은 인/아웃이 무시돼 소스 처음부터 들어감)
        for a, b in zip(cuts, cuts[1:]):
            mid = (a + b) / 2 / FR
            isA = any(t["s"] <= mid < t["e"] for t in A)
            if isA:
                cand = [j for j in segs if j["piece"] == pi and PL.get(j["id"], {}).get("ok")]
                j = min(cand or [j for j in segs if PL.get(j["id"], {}).get("ok")], key=lambda j: 0 if j["src_s"] - 0.05 <= mid <= j["src_e"] + 0.05 else min(abs(j["src_s"] - mid), abs(j["src_e"] - mid)) + 1)
                sc, pos = a_motion(PL[j["id"]]); cam = "A%d" % j["id"]
            else:
                sc, pos, cam = bsc, bpos, "B"
            R.append(dict(a=round(a / FR, 5), b=round(b / FR, 5), at=round((t0 + a - f0) / FR, 5), sc=sc, pos=pos, cam=cam))
    json.dump(R, open(os.path.join(out, s["name"] + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(s["name"], len(R), "A", sum(r["cam"] != "B" for r in R))
