"""레퍼런스 화면에서 글자 줄 위치·크기 재기 (원본 1920×1080 png)
  python measure_lines.py <png> <x0,y0,x1,y1> <색> [줄 사이 최소 빈 줄(px)=6]
  색: white | yellow | red | blue | dark | rgb:R,G,B[,허용차]
  → 줄마다 ink 범위 x0~x1, y0~y1, 높이, 가운데 x  (글자 높이 = 그 줄에서 가장 큰 글자의 위~아래)
"""
import sys
import numpy as np
from PIL import Image
p, box, mode = sys.argv[1], [int(v) for v in sys.argv[2].split(",")], sys.argv[3]
gap = int(sys.argv[4]) if len(sys.argv) > 4 else 6
a = np.asarray(Image.open(p).convert("RGB")).astype(int)[box[1]:box[3], box[0]:box[2]]
R, G, B = a[..., 0], a[..., 1], a[..., 2]; mx, mn = a.max(2), a.min(2)
if mode == "white": m = (mn > 205) & (mx - mn < 40)
elif mode == "yellow": m = (R > 200) & (G > 180) & (B < 110)
elif mode == "red": m = (R > 170) & (G < 90) & (B < 90)
elif mode == "blue": m = (B > 170) & (R < 110) & (B - R > 80)
elif mode == "dark": m = mx < 80
elif mode.startswith("rgb:"):
    v = [int(x) for x in mode[4:].split(",")]; tol = v[3] if len(v) > 3 else 40
    m = (np.abs(a - np.array(v[:3])).max(2) < tol)
rows = m.sum(1) >= 2
lines, i, n = [], 0, len(rows)
while i < n:
    if rows[i]:
        j = i
        while j < n:
            if rows[j]: j += 1; continue
            k = j
            while k < n and not rows[k] and k - j < gap: k += 1
            if k < n and rows[k] and k - j < gap: j = k; continue
            break
        cols = np.where(m[i:j].sum(0) >= 1)[0]
        if j - i >= 4 and len(cols): lines.append((box[0] + cols.min(), box[0] + cols.max(), box[1] + i, box[1] + j - 1))
        i = j
    else: i += 1
for k, (x0, x1, y0, y1) in enumerate(lines):
    print(f"줄{k+1}: x {x0}~{x1} (가운데 {(x0+x1)//2}, 폭 {x1-x0+1})  y {y0}~{y1} (높이 {y1-y0+1})")
if len(lines) > 1: print("줄 위끝 간격:", [lines[k + 1][2] - lines[k][2] for k in range(len(lines) - 1)])
