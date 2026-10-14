import glob, os, sys
import numpy as np
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")
rows = []
for s in sorted(glob.glob("src_*_f??0.png")):
    k = os.path.basename(s)[4:]
    a = "cmp/ae_" + k
    if not os.path.exists(a): continue
    S = np.asarray(Image.open(s).convert("RGB")).astype(float); A = np.asarray(Image.open(a).convert("RGB")).astype(float)
    def bb(X):
        m = X.max(2) > 24; ys, xs = np.where(m)
        return (xs.min(), ys.min(), xs.max(), ys.max()) if len(xs) else None
    bs, ba = bb(S), bb(A)
    es, ea = S.sum(), A.sum()
    diff = np.abs(S - A).mean()
    print(f"{k:22s} src {bs}  ae {ba}  밝기비 {ea/es if es else 0:5.2f}  평균차 {diff:5.2f}")
    rows.append((k, S, A, bs, ba))
# 시트: 요소별 마지막(정착) 프레임 비교 — 위 원본, 아래 AE
for name in ["tip", "yellow2", "infobar", "bracket"]:
    k = f"{name}_f400.png"
    for r in rows:
        if r[0] == k:
            _, S, A, bs, ba = r
            x0 = max(0, min(bs[0], ba[0]) - 20); y0 = max(0, min(bs[1], ba[1]) - 20); x1 = max(bs[2], ba[2]) + 20; y1 = max(bs[3], ba[3]) + 20
            c = np.vstack([S[y0:y1, x0:x1], np.full((6, x1 - x0, 3), 255), A[y0:y1, x0:x1], np.full((6, x1 - x0, 3), 255), np.abs(S - A)[y0:y1, x0:x1] * 3])
            Image.fromarray(np.clip(c, 0, 255).astype(np.uint8)).save(f"cmp/sheet_{name}.png")
