import numpy as np, sys
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")
L = lambda p: np.asarray(Image.open(p).convert("RGB")).astype(float)
def bb(X, t=60):
    m = X.max(2) > t; ys, xs = np.where(m)
    return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else None
def colors(X):
    R, G, B = X[..., 0], X[..., 1], X[..., 2]; f = X.max(2) > 60
    out = {}
    for nm, m in (("하늘", f & (B > R + 60) & (B >= G - 10)), ("초록", f & (G > R + 40) & (G > B + 40)), ("노랑", f & (R > 200) & (G > 170) & (B < 120)), ("흰", f & (X.min(2) > 200))):
        if m.sum() < 50: continue
        yy, xx = np.where(m); top = np.median(X[yy.min() + 3][m[yy.min() + 3]], 0) if m[yy.min() + 3].any() else None
        bot = np.median(X[yy.max() - 3][m[yy.max() - 3]], 0) if m[yy.max() - 3].any() else None
        out[nm] = (int(m.sum()), int(xx.min()), int(xx.max()), None if top is None else top.round().astype(int).tolist(), None if bot is None else bot.round().astype(int).tolist())
    return out
for g in ("b1", "b2", "c"):
    rs, ra = L(f"{g}_s300.png").sum(), L(f"cmp/{g}_s300.png").sum()
    print(f"== {g}  정착 밝기비 {ra/rs:.3f}")
    print("   원본", bb(L(f"{g}_s300.png")), colors(L(f"{g}_s300.png")))
    print("   AE  ", bb(L(f"cmp/{g}_s300.png")), colors(L(f"cmp/{g}_s300.png")))
    row = []
    for f in (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20):
        a, b = L(f"{g}_s{f:02d}0.png"), L(f"cmp/{g}_s{f:02d}0.png")
        ba, bb_ = bb(a), bb(b)
        row.append(f"f{f}:{a.sum()/rs*100:.0f}/{b.sum()/ra*100:.0f}% x{ba[0] if ba else '-'}/{bb_[0] if bb_ else '-'}")
    print("   " + "  ".join(row))
for g in ("b3", "b4"):
    o = L(f"{g}_s0.png"); a = L(f"cmp/{g}_s0.png")
    print(f"== {g} 원본 {bb(o)} / AE {bb(a)}  밝기비 {a.sum()/o.sum():.3f}")
