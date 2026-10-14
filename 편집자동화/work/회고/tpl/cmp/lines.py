import sys, numpy as np
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")
def bands(p, mode):
    X = np.asarray(Image.open(p).convert("RGB")).astype(int)
    R, G, B = X[..., 0], X[..., 1], X[..., 2]
    masks = {"white": (R > 200) & (G > 200) & (B > 200), "yellow": (R > 200) & (G > 200) & (B < 80),
             "indigo": (abs(R - 60) < 25) & (abs(G - 57) < 25) & (abs(B - 141) < 30), "green": (R < 120) & (G > 180) & (B > 130) & (B < 220)}
    out = {}
    for k, m in masks.items():
        ys, xs = np.where(m)
        if len(xs) < 50: continue
        rows = np.where(m.sum(1) > 2)[0]
        # 연속 구간
        segs = []; s = rows[0]; pr = rows[0]
        for r in rows[1:]:
            if r > pr + 3: segs.append((s, pr)); s = r
            pr = r
        segs.append((s, pr))
        res = []
        for a, b in segs:
            if b - a < 6: continue
            sub = m[a:b + 1]; xx = np.where(sub.any(0))[0]
            res.append((int(xx.min()), int(a), int(xx.max()), int(b), int(sub.sum())))
        out[k] = res
    return out
for n in ["tip", "yellow2", "infobar", "bracket"]:
    s = bands(f"src_{n}_f400.png", 0); a = bands(f"cmp/ae_{n}_f400.png", 0)
    print("==", n)
    for k in s:
        print(f"  {k:7s} src {s[k]}\n          ae  {a.get(k)}")
