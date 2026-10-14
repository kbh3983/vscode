"""글자(열 빈틈 기준 덩어리)별 세로·가로 움직임 측정 — 봄자막처럼 글자마다 움직이는 템플릿

사용: python scripts/point/ae/measure_chars.py <폴더> <접두> --n 60
"""
import argparse, os, sys
import numpy as np
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")
ap = argparse.ArgumentParser(); ap.add_argument("folder"); ap.add_argument("pre"); ap.add_argument("--n", type=int, default=60); ap.add_argument("--th", type=float, default=50)
a = ap.parse_args()
A = [np.asarray(Image.open(os.path.join(a.folder, f"{a.pre}{n:02d}.png")))[..., 3].astype(float) for n in range(a.n)]
M = np.max(A, axis=0)
ys = np.where(M.max(axis=1) > 20)[0]; y0, y1 = ys.min() - 5, ys.max() + 5
cols = M[y0:y1].sum(axis=0)
segs, on = [], False
for x, v in enumerate(cols):
    if v > a.th and not on: s, on = x, True
    if v <= a.th and on: segs.append((s, x)); on = False
segs = [g for g in segs if g[1] - g[0] > 8]
print("덩어리", len(segs), segs)
C = []
for al in A:
    row = []
    for s, e in segs:
        sub = al[y0:y1, s:e]; t = sub.sum() or 1
        row.append(((sub.sum(axis=0) * np.arange(e - s)).sum() / t + s, (sub.sum(axis=1) * np.arange(y1 - y0)).sum() / t + y0))
    C.append(row)
C = np.array(C); D = C - C.mean(axis=0)
ac = lambda v: np.corrcoef(v[:-1], v[1:])[0, 1] if v.std() > 0 else 0
print("세로 표준편차", np.round(D[..., 1].std(axis=0), 2))
print("가로 표준편차", np.round(D[..., 0].std(axis=0), 2))
print("세로 앞프레임 상관", np.round([ac(D[:, i, 1]) for i in range(len(segs))], 2))
if len(segs) > 1:
    print("이웃 덩어리 세로 상관", np.round([np.corrcoef(D[:, i, 1], D[:, i + 1, 1])[0, 1] for i in range(len(segs) - 1)], 2))
print("덩어리0 세로(0~19)", np.round(D[:20, 0, 1], 1))
print("덩어리1 세로(0~19)", np.round(D[:20, 1, 1], 1) if len(segs) > 1 else "")
np.save(os.path.join(a.folder, a.pre + "chars.npy"), D)
