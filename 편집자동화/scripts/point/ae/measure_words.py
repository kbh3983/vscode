"""단어별 흔들림 측정 (포인트 에이전트 — 08·10_분노처럼 단어마다 따로 흔들리는 템플릿)

사용: python scripts/point/ae/measure_words.py <폴더> <접두> [--n 60]
- 프레임 평균 알파의 열 빈틈으로 단어 구간을 찾고, 프레임마다 단어 무게중심 → 표준편차·최대·앞 프레임과 상관
"""
import argparse, os
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser(); ap.add_argument("folder"); ap.add_argument("pre"); ap.add_argument("--n", type=int, default=60)
a = ap.parse_args()
A = [np.asarray(Image.open(os.path.join(a.folder, f"{a.pre}{n:02d}.png")))[..., 3].astype(float) for n in range(a.n)]
M = np.mean(A, axis=0)
ys = np.where(M.max(axis=1) > 20)[0]; y0, y1 = ys.min() - 10, ys.max() + 10
cols = M[y0:y1].sum(axis=0)
segs, on = [], False
for x, v in enumerate(cols):
    if v > 200 and not on: s, on = x, True
    if v <= 200 and on: segs.append((s, x)); on = False
segs = [g for g in segs if g[1] - g[0] > 25]
# 구간 사이 가운데로 경계를 넓힘
bounds = [(segs[0][0] - 20 if i == 0 else (segs[i - 1][1] + g[0]) // 2, segs[-1][1] + 20 if i == len(segs) - 1 else (g[1] + segs[i + 1][0]) // 2) for i, g in enumerate(segs)]


def cent(al, s, e):
    sub = al[y0:y1, s:e]; t = sub.sum()
    return (sub.sum(axis=0) * np.arange(e - s)).sum() / t + s, (sub.sum(axis=1) * np.arange(y1 - y0)).sum() / t + y0


C = np.array([[cent(al, s, e) for s, e in bounds] for al in A]); D = C - C.mean(axis=0)
ac = lambda v: np.corrcoef(v[:-1], v[1:])[0, 1]
print("단어", len(bounds), "구간", bounds, " 세로 범위", (y0, y1))
for w in range(len(bounds)):
    dx, dy = D[:, w, 0], D[:, w, 1]
    print(f"단어{w}: 표준편차 x {dx.std():.2f} y {dy.std():.2f} | 최대 x {abs(dx).max():.1f} y {abs(dy).max():.1f} | 앞프레임 상관 x {ac(dx):.2f} y {ac(dy):.2f}")
print(f"평균: 표준편차 {D[..., 0].std():.2f}/{D[..., 1].std():.2f}, 상관 {np.mean([ac(D[:, w, 0]) for w in range(len(bounds))]):.2f}/{np.mean([ac(D[:, w, 1]) for w in range(len(bounds))]):.2f}")
