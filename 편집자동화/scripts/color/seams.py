"""색보정 에이전트 — 카메라가 바뀌는 지점에서 직전·직후 화면 비교 (최종 렌더 1개로, 기준 렌더 없이).

  python seams.py <plan.json> <final.mp4> [간격초=0.3]
V1이 보이는 구간마다 들어갈 때(V2→V1)·나올 때(V1→V2) 경계 앞뒤 프레임의
흰 배경 색·밝기, 피부 색 진하기((R−B)/R), 검정(어두운 5%)을 비교한다. 이어진 V1 조각 사이 경계는 건너뜀.
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import img  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")


def measure(mp4, t):
    s = img.stats(img.frame_from_video(mp4, t))
    w, sk = s["wall"], s["skin"]
    return {"rb": w[0] - w[2], "gm": w[1] - (w[0] + w[2]) / 2, "luma": s["wall_luma"],
            "skin_sat": (sk[0] - sk[2]) / sk[0] if sk is not None else None,
            "skin_rg": sk[0] - sk[1] if sk is not None else None, "black": s["black_p5"]}


def main(plan, mp4, gap=0.3):
    gap = float(gap)
    vis = json.load(open(plan, encoding="utf-8"))["v1_visible"]
    rows = []
    for k, c in enumerate(vis):
        prev_join = k > 0 and abs(vis[k - 1]["end"] - c["start"]) < 0.05
        next_join = k + 1 < len(vis) and abs(vis[k + 1]["start"] - c["end"]) < 0.05
        for kind, t, join in (("V2→V1", c["start"], prev_join), ("V1→V2", c["end"], next_join)):
            if join:
                continue
            a, b = measure(mp4, t - gap), measure(mp4, t + gap)
            v1, v2 = (b, a) if kind == "V2→V1" else (a, b)
            d = {"index": c["index"], "kind": kind, "t": round(t, 2),
                 "d_rb": round(v1["rb"] - v2["rb"], 1), "d_gm": round(v1["gm"] - v2["gm"], 1),
                 "d_luma": round(v1["luma"] - v2["luma"], 1), "d_black": round(v1["black"] - v2["black"], 1),
                 "d_skin_sat": round(v1["skin_sat"] - v2["skin_sat"], 3) if v1["skin_sat"] and v2["skin_sat"] else None}
            rows.append(d)
            ss = f"{d['d_skin_sat']:+.3f}" if d["d_skin_sat"] is not None else "  -  "
            flag = "!" if abs(d["d_rb"]) > 3 or abs(d["d_gm"]) > 3 or abs(d["d_luma"]) > 6 or (d["d_skin_sat"] and abs(d["d_skin_sat"]) > 0.05) else ""
            print(f"V1[{c['index']:3d}] {kind} {int(t // 60)}:{t % 60:05.2f}  벽 R−B {d['d_rb']:+5.1f} G−중간 {d['d_gm']:+5.1f} "
                  f"밝기 {d['d_luma']:+5.1f} 검정 {d['d_black']:+5.1f} 피부 진하기 {ss} {flag}")
    out = plan.replace("_plan.json", "_seams.json")
    json.dump(rows, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    sk = [r["d_skin_sat"] for r in rows if r["d_skin_sat"] is not None]
    print(f"경계 {len(rows)}곳 | 피부 진하기 차이(V1−V2) 중앙 {np.median(sk):+.3f} | 벽 R−B 중앙 {np.median([r['d_rb'] for r in rows]):+.1f} "
          f"| 밝기 중앙 {np.median([r['d_luma'] for r in rows]):+.1f}")


if __name__ == "__main__":
    main(*sys.argv[1:])
