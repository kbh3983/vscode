"""색보정 에이전트 — V1(맞출 트랙)과 V2(기준) 같은 시각 화면 비교.

실행: .venv/Scripts/python scripts/color/pairs.py <v1 접두어> [v2 접두어=v2ref]
  work/색보정/ame/<접두어>_<시각>0.png 를 읽는다 (AME가 이름 끝에 0을 붙임)
"""
import sys

import numpy as np

sys.path.insert(0, __file__.replace("\\", "/").rsplit("/", 1)[0])
import img  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
TIMES = ["10.5", "27", "51"]
D = "work/색보정/ame/"


def main(p1, p2="v2ref"):
    rows = []
    for t in TIMES:
        a, b = img.stats(img.read_rgb(f"{D}{p1}_{t}0.png")), img.stats(img.read_rgb(f"{D}{p2}_{t}0.png"))
        print(img.show(f"{p1}_{t}", a))
        print(img.show(f"{p2}_{t}", b))
        rows.append((a, b))
    w = np.mean([a["wall"] for a, _ in rows], 0)
    sk1 = np.mean([a["skin"] for a, _ in rows if a["skin"] is not None], 0)
    sk2 = np.mean([b["skin"] for _, b in rows if b["skin"] is not None], 0)
    print(f"V1 벽 평균 {img.describe(w)}  G−(R+B)/2 {w[1] - (w[0] + w[2]) / 2:+.1f}  밝기 {np.mean([a['wall_luma'] for a, _ in rows]):.1f}"
          f" / V2 벽 밝기 {np.mean([b['wall_luma'] for _, b in rows]):.1f}")
    print(f"피부 V1 R−G {sk1[0] - sk1[1]:+.1f} G−B {sk1[1] - sk1[2]:+.1f} 밝기 {sk1.mean():.0f} | "
          f"V2 R−G {sk2[0] - sk2[1]:+.1f} G−B {sk2[1] - sk2[2]:+.1f} 밝기 {sk2.mean():.0f}")
    print(f"검정 p5 V1 {np.mean([a['black_p5'] for a, _ in rows]):.1f} / V2 {np.mean([b['black_p5'] for _, b in rows]):.1f}")


if __name__ == "__main__":
    main(*sys.argv[1:])
