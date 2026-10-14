"""색보정 에이전트 — V1 클립별로 같은 순간의 V2(기준)와 비교하고 다음 값을 제안.

기준 (2026-10-09 사용자와 정함):
  - 밝기는 흰 배경(벽)과 검정(어두운 5%)만으로 맞춘다
  - 피부는 색(붉은 기 R−G, 노란 기 G−B)에만 쓰고 밝기에는 쓰지 않는다
  - 클립마다 따로 맞춘다
실행: .venv/Scripts/python scripts/color/clipmatch.py <V1 접두어> <현재값 JSON>
  현재값 JSON 예: {"10.5": {"14":-12,"15":2.2,"16":115,"19":0,"22":0,"24":0}, ...}
"""
import json
import sys

sys.path.insert(0, __file__.replace("\\", "/").rsplit("/", 1)[0])
import img  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
D = "work/색보정/ame30/"
# 측정으로 얻은 기울기 (log/2026-10-09.md)
K_TEMP = 1.8      # 온도 +1당 벽 R−B 변화 (B캠·채도 115에서 실측. C캠·채도 100은 1.23)
K_TINT = -0.92    # 색조 +1당 벽 G−(R+B)/2 변화 (색조를 올리면 마젠타)
K_EXPO = 34.0     # 노출 1당 벽 밝기
K_BLACK = 0.9     # 검정 1당 어두운 5% 밝기 (어두운 영역 0일 때 실측. 어두운 영역 70일 때는 2.9)


def main(prefix, cur_path):
    cur = json.load(open(cur_path, encoding="utf-8"))
    nxt = {}
    for t, v in cur.items():
        a = img.stats(img.read_rgb(f"{D}{prefix}_{t}0.png"))
        b = img.stats(img.read_rgb(f"{D}v2ref_{t}0.png"))
        w = a["wall"]
        rb, gm = w[0] - w[2], w[1] - (w[0] + w[2]) / 2
        dl, db = b["wall_luma"] - a["wall_luma"], b["black_p5"] - a["black_p5"]
        sa, sb = a["skin"], b["skin"]
        print(f"{t:>5}초 | 벽 R−B {rb:+.1f} G−중간 {gm:+.1f} | 벽 밝기 {a['wall_luma']:.0f}→목표 {b['wall_luma']:.0f} ({dl:+.0f})"
              f" | 검정 {a['black_p5']:.0f}→목표 {b['black_p5']:.0f} ({db:+.0f})"
              + (f" | 피부 R−G {sa[0] - sa[1]:+.0f}/{sb[0] - sb[1]:+.0f} G−B {sa[1] - sa[2]:+.0f}/{sb[1] - sb[2]:+.0f}" if sa is not None and sb is not None else ""))
        n = dict(v)
        n["14"] = round(v["14"] - rb / K_TEMP, 1)
        n["15"] = round(v["15"] - gm / K_TINT, 1)
        n["19"] = round(v["19"] + dl / K_EXPO, 2)
        n["24"] = round(v["24"] + db / K_BLACK, 1)
        nxt[t] = n
    json.dump(nxt, open(cur_path.replace(".json", "_next.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("다음 값:", json.dumps(nxt, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
