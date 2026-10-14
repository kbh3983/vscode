"""참고 3편 — 화면에 보이는 카메라 구간 (위 트랙의 켜진 카메라 클립이 이김) + 모션 + 대사 → <이름>_cams.json, 요약 출력"""
import json, os, sys
from collections import defaultdict
sys.stdout.reconfigure(encoding="utf-8")
H = os.path.dirname(os.path.abspath(__file__))
FPS = 29.97


def motion(c):
    for x in c["c"]:
        if x["m"] == "AE.ADBE Motion":
            d = {p[1]: p for p in x["p"]}
            key = any(len(p) > 3 and p[3] == 1 for p in x["p"])
            return round(d["비율 조정"][2], 1), [round(v, 3) for v in d["위치"][2]], round(d["회전"][2], 2), key
    return None


for nm in ["기초체력", "스틱터틀볼", "둔근1"]:
    d = json.load(open(os.path.join(H, nm + ".json"), encoding="utf-8"))
    words = json.load(open(os.path.join(H, nm + "_words.json"), encoding="utf-8"))
    pm = {c["name"]: c["path"] for t in d["video"] for c in t["clips"] if c.get("path")}
    camclips = []
    for ti, t in enumerate(d["video"]):
        for c in t["clips"]:
            p = c.get("path") or pm.get(c["name"], "")
            if c["name"].upper().startswith("C00") and not c.get("off"):
                cam = "cam1" if "cam 1" in p else ("cam2" if "cam 2" in p else "?")
                camclips.append((ti, c, cam))
    end = max(c["e"] for ti, c, cam in camclips)
    # 1프레임 단위로 위쪽 트랙 카메라
    segs = []
    n = int(end * FPS)
    cur = None
    for f in range(n):
        t = (f + 0.5) / FPS
        top = None
        for ti, c, cam in camclips:
            if c["s"] <= t < c["e"] and (top is None or ti > top[0]): top = (ti, c, cam)
        key = (top[2], top[0], id(top[1])) if top else None
        if cur and cur["key"] == key:
            cur["e"] = (f + 1) / FPS
        else:
            if cur: segs.append(cur)
            cur = {"key": key, "s": f / FPS, "e": (f + 1) / FPS, "cam": top[2] if top else "-", "track": "V%d" % (top[0] + 1) if top else "-",
                   "mo": motion(top[1]) if top else None}
    segs.append(cur)
    # 같은 카메라·같은 모션이 이어지면 합침 (클립 경계만 있는 곳)
    m = []
    for s in segs:
        if m and m[-1]["cam"] == s["cam"] and m[-1]["mo"] == s["mo"] and abs(m[-1]["e"] - s["s"]) < 0.02:
            m[-1]["e"] = s["e"]; m[-1]["n"] += 1
        else:
            s["n"] = 1; m.append(s)
    for s in m:
        s.pop("key", None)
        s["len"] = round(s["e"] - s["s"], 2)
        s["said"] = " ".join(w["w"] for w in words if s["s"] <= (w["s"] + w["e"]) / 2 < s["e"])
    json.dump(m, open(os.path.join(H, nm + "_cams.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    tot = defaultdict(float); cnt = defaultdict(int)
    for s in m: tot[s["cam"]] += s["len"]; cnt[s["cam"]] += 1
    T = sum(tot.values())
    print(f"===== {nm} 본편 {end:.1f}s 구간 {len(m)}: " + ", ".join(f"{k} {v:.1f}s({v / T * 100:.0f}%) {cnt[k]}번" for k, v in tot.items()))
    mos = defaultdict(float)
    for s in m: mos[(s["cam"], s["mo"][0] if s["mo"] else None)] += s["len"]
    print("  크기별:", ", ".join(f"{k[0]} {k[1]}% {v:.0f}s" for k, v in sorted(mos.items(), key=lambda x: -x[1])[:14]))
