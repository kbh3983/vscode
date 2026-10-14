"""막대 글자("ㅣ")로 글자별 높이·기울기 측정 — 튈 때 기울기 확인용

사용: python scripts/point/ae/measure_tilt.py <폴더> <접두> <프레임 수>
"""
import sys
import numpy as np
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")
D, pre, N = sys.argv[1], sys.argv[2], int(sys.argv[3])
A = [np.asarray(Image.open(f"{D}/{pre}{n:02d}.png").convert("RGBA")).astype(float) for n in range(N)]
F = [(a[..., 3] > 200) & (a[..., :3].min(axis=2) > 150) for a in A]
M = np.max(F, axis=0); ys = np.where(M.max(1))[0]; y0, y1 = ys.min() - 3, ys.max() + 3
cols = M[y0:y1].sum(0); segs, on = [], False
for x, v in enumerate(cols):
    if v > 0 and not on: s, on = x, True
    if v == 0 and on: segs.append((s, x)); on = False
segs = [g for g in segs if g[1] - g[0] > 3]
Y, R = [], []
for f in F:
    yr, rr = [], []
    for s, e in segs:
        yy, xx = np.where(f[y0:y1, s:e]); yr.append(yy.mean())
        xx = xx - xx.mean(); yy2 = yy - yy.mean()
        w, v = np.linalg.eigh(np.cov(np.vstack([xx, yy2]))); d = v[:, 1]
        a = np.degrees(np.arctan2(d[0], d[1]))  # 세로 막대 기준 기울기
        rr.append((a + 90) % 180 - 90)
    Y.append(yr); R.append(rr)
Y = np.array(Y); R = np.array(R); up = -(Y - Y.mean(0)); R = R - np.median(R, 0)
ac = lambda v: np.corrcoef(v[:-1], v[1:])[0, 1]
tilted = np.abs(R) > 2
print(f"글자 {len(segs)} | 높이 표준편차 {up.std(0).mean():.2f} | 앞프레임 상관 {np.mean([ac(up[:, i]) for i in range(len(segs))]):.2f}")
print(f"기울어진(>2도) 비율 {tilted.mean() * 100:.1f}% | 기울 때 평균 {np.abs(R)[tilted].mean() if tilted.any() else 0:.1f}도 | 최대 {np.abs(R).max():.1f}도")
print(f"기울어진 순간 높이 평균 {up[tilted].mean() if tilted.any() else 0:.1f}px (전체 표준편차 {up.std():.1f}) | 안 기운 순간 {up[~tilted].mean():.1f}px")
print("글자별 기울어진 프레임 수", tilted.sum(0))
# 부드러움: 프레임마다 기울기 변화량(도), 높이와 기울기 관계
dR = np.abs(np.diff(R, axis=0))
print(f"프레임당 기울기 변화: 평균 {dR[np.abs(R[1:]) > 2].mean() if (np.abs(R[1:]) > 2).any() else 0:.2f}도, 최대 {dR.max():.2f}도, 3도 넘게 바뀐 프레임 {(dR > 3).sum()}번")
print("높이(위로)와 |기울기| 상관 글자별", np.round([np.corrcoef(up[:, i], np.abs(R[:, i]))[0, 1] if R[:, i].std() > 0 else 0 for i in range(len(segs))], 2))
