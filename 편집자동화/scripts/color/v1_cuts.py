"""색보정 에이전트 — 컷전환 시퀀스에서 V1을 자를 지점 (보이는 V1 조각만 따로 보정하기 위해).

  python v1_cuts.py <video.json> <out.js>
V2가 꺼진 구간(이어진 것은 합침)의 시작·끝 중 V1 클립 경계가 아닌 곳 → RAZOR(드롭프레임 타임코드).
out.js: var RAZOR=[...];  → ExtendScript에서 V1(QE 트랙 0)만 razor
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cut"))
from ops import df_tc  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
FPS = 30000 / 1001


def main(vj, out):
    d = json.load(open(vj, encoding="utf-8"))
    off = []
    for c in d["tracks"]["V2"]:
        if not c["disabled"]:
            continue
        if off and abs(off[-1][1] - c["start"]) < 0.02:
            off[-1][1] = c["end"]
        else:
            off.append([c["start"], c["end"]])
    edges = [e for c in d["tracks"]["V1"] for e in (c["start"], c["end"])]
    razor = []
    for s, e in off:
        for t in (s, e):
            if min(abs(x - t) for x in edges) > 0.02:
                razor.append(df_tc(round(t * FPS)))
    open(out, "w", encoding="utf-8").write(f"var RAZOR={json.dumps(razor)};\n")
    print(f"V2 꺼진 구간 {len(off)}개, V1 자를 곳 {len(razor)}곳")


if __name__ == "__main__":
    main(*sys.argv[1:])
