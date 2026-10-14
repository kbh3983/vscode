"""컷전환 에이전트 — 다른 캠 구간 목록 → apply_switch.jsx 입력 (RAZOR, OFF, MARK) + 비율.

  python plan.py <video.json> <segments.json> <범위끝초> <out.js>
segments.json: [[시작초, 끝초, "이유"], ...]  (V2를 끌 구간)
경계가 기존 V2 클립 경계에서 0.1초 안이면 그 경계에 맞추고(새로 자르지 않음), 아니면 프레임에 맞춰 razor.
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cut"))
from ops import df_tc  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
FPS = 30000 / 1001


def main(vj, sj, end, out):
    d = json.load(open(vj, encoding="utf-8"))
    segs = json.load(open(sj, encoding="utf-8"))
    end = float(end)
    edges = sorted({round(c["start"], 4) for c in d["tracks"]["V2"]} | {round(c["end"], 4) for c in d["tracks"]["V2"]})
    razor, off, mark, total, snapped = [], [], [], 0.0, 0
    for s, e, why in sorted(segs):
        pts = []
        for t in (s, e):
            near = min(edges, key=lambda x: abs(x - t))
            if abs(near - t) <= 0.1:
                pts.append(near); snapped += 1
            else:
                f = round(t * FPS)
                razor.append(df_tc(f))
                pts.append(f / FPS)
        off.append([round(pts[0], 4), round(pts[1], 4)])
        mark.append([round(pts[0], 4), round(pts[1], 4), "컷전환 B캠", why, 4])
        total += pts[1] - pts[0]
    mark.append([end, end, "컷전환 범위 끝", "여기까지 작업", 1])
    js = (f"var RAZOR={json.dumps(razor)};\nvar OFF={json.dumps(off)};\n"
          f"var MARK={json.dumps(mark, ensure_ascii=False)};\n")
    open(out, "w", encoding="utf-8").write(js)
    print(f"구간 {len(segs)}개, 다른 캠 {total:.1f}초 / {end:.1f}초 = {total / end * 100:.1f}%, "
          f"새로 자름 {len(razor)}곳, 기존 컷 지점 사용 {snapped}곳")


if __name__ == "__main__":
    main(*sys.argv[1:])
