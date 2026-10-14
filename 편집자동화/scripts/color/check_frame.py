"""색보정 에이전트 — Premiere에서 뽑은 화면이 정말 그 시각인지 확인.

시퀀스 클립 목록(JSON)으로 시각 t에 각 트랙이 보여야 할 원본 장면을 ffmpeg로 뽑아,
내보낸 화면과 흑백 구조(색 보정과 무관)의 상관을 비교한다.
실행: .venv/Scripts/python scripts/color/check_frame.py <clips.json> <png> <t>
"""
import json
import sys

import numpy as np

sys.path.insert(0, __file__.replace("\\", "/").rsplit("/", 1)[0])
import img  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")


def gray_small(im):
    g = im @ np.array([0.2126, 0.7152, 0.0722])
    g = g[::8, ::8]
    return (g - g.mean()) / (g.std() + 1e-6)


def check(clips, png, t):
    ex = gray_small(img.read_rgb(png))
    out = []
    for tr, cs in clips.items():
        for c in cs:
            if c["start"] <= t < c["end"]:
                src = img.frame_from_video(c["path"], c["in"] + (t - c["start"]))
                corr = float((ex * gray_small(src)).mean())
                out.append((tr, c["name"], c["disabled"], round(corr, 3)))
    return out


if __name__ == "__main__":
    clips = json.load(open(sys.argv[1], encoding="utf-8"))
    for r in check(clips, sys.argv[2], float(sys.argv[3])):
        print(r)
