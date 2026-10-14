"""10_분노 비교: 프레임별 상자·중심, 전체 흔들림, 그라데이션 줄별 색 (원본 pr_ vs 새 것 ae_)"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import numpy as np
from PIL import Image

D = sys.argv[1]


def load(p, n): return np.asarray(Image.open(f"{D}/{p}{n:02d}.png").convert("RGBA")).astype(float)


def box(a):
    ys, xs = np.where(a[..., 3] > 25)
    return (ys.min(), ys.max(), xs.min(), xs.max()) if len(ys) else None


for n in range(0, 9):
    print(n, "PR", box(load("pr_", n)), "AE", box(load("ae_", n)))
for p in ["pr_", "ae_"]:
    cx, cy = [], []
    for n in range(8, 60):
        al = load(p, n)[..., 3]; s = al.sum()
        cx.append((al.sum(0) * np.arange(al.shape[1])).sum() / s); cy.append((al.sum(1) * np.arange(al.shape[0])).sum() / s)
    cx, cy = np.array(cx), np.array(cy); ac = lambda v: np.corrcoef(v[:-1], v[1:])[0, 1]
    print(p, "흔들림 표준편차", cx.std().round(2), cy.std().round(2), "상관", round(ac(cx), 2), round(ac(cy), 2), "평균", cx.mean().round(1), cy.mean().round(1))
    a = load(p, 30); rgb = a[..., :3]; al = a[..., 3] > 250
    b = box(a); rows = []
    for y in range(b[0], b[1], 10):
        row = rgb[y][al[y]]; red = row[(row[:, 0] > 150) & (row[:, 0] - row[:, 2] > 60)]
        rows.append(tuple(red.mean(0).round().astype(int)) if len(red) else "-")
    print(p, "그라데이션", rows)
