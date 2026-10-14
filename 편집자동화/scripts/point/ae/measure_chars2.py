"""글자별 세로 흔들림 (채움 밝은 부분 기준으로 글자를 나눔) — 원본과 새 것 비교

사용: python scripts/point/ae/measure_chars2.py <폴더> <프레임 수> [접두 ...]  (기본 pr_ ae_)
출력: 글자 수, 글자별 세로 표준편차 평균, 앞 프레임 상관 평균, 이웃 글자 상관 평균, 전체 상자
"""
import sys
import numpy as np
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")
D, N = sys.argv[1], int(sys.argv[2]); pres = sys.argv[3:] or ["pr_", "ae_"]
for pre in pres:
    A = [np.asarray(Image.open(f"{D}/{pre}{n:02d}.png").convert("RGBA")).astype(float) for n in range(N)]
    F = [((a[..., 3] > 200) & (a[..., :3].min(axis=2) > 150)).astype(float) for a in A]
    M = np.max(F, axis=0); ys = np.where(M.max(1) > 0)[0]; y0, y1 = ys.min() - 3, ys.max() + 3
    cols = M[y0:y1].sum(0); segs, on = [], False
    for x, v in enumerate(cols):
        if v > 0 and not on: s, on = x, True
        if v == 0 and on: segs.append((s, x)); on = False
    segs = [g for g in segs if g[1] - g[0] > 6]
    C = np.array([[((f[y0:y1, s:e].sum(1) * np.arange(y1 - y0)).sum() / max(f[y0:y1, s:e].sum(), 1) + y0) for s, e in segs] for f in F])
    Dd = C - C.mean(0); ac = lambda v: np.corrcoef(v[:-1], v[1:])[0, 1] if v.std() > 0 else 0
    al = A[N // 2][..., 3]; yy, xx = np.where(al > 25)
    print(f"{pre} 글자 {len(segs)} | 세로 표준편차 평균 {Dd.std(0).mean():.2f} (최대 {Dd.std(0).max():.2f}) | 앞프레임 상관 {np.mean([ac(Dd[:, i]) for i in range(len(segs))]):.2f} | 이웃 상관 {np.mean([np.corrcoef(Dd[:, i], Dd[:, i + 1])[0, 1] for i in range(len(segs) - 1)]):.2f} | 상자 {yy.min(), yy.max(), xx.min(), xx.max()}")
