"""참고 영상에서 글자 색 픽셀을 골라 프레임마다 위치·폭·덮인 면적을 잰다.
사용: python measure.py <영상> <시작초> <길이초> <색이름> [crop=w:h:x:y]
"""
import subprocess, sys
import numpy as np

src, start, dur, color = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
crop = sys.argv[5] if len(sys.argv) > 5 else "1748:600:0:185"
cw, ch, cx, cy = [int(v) for v in crop.split(":")]

raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(dur), "-i", src,
                      "-vf", f"crop={crop}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                     capture_output=True, check=True).stdout
d = np.frombuffer(raw, np.uint8).reshape(-1, ch, cw, 3).astype(int)

def mask(f):
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    if color == "blue":   return (b - r > 70) & (b > 150)
    if color == "red":    return (r - g > 90) & (r - b > 70)
    if color == "mint":   return (g - r > 90) & (g > 170)
    if color == "green":  return (g - r > 50) & (g - b > 15) & (g > 110)
    if color == "white":  return (r > 205) & (g > 205) & (b > 205)
    if color == "yellow": return (r > 200) & (g > 170) & (b < 140)
    raise SystemExit("unknown color")

prev = None
for i, f in enumerate(d):
    m = mask(f)
    cols = np.where(m.sum(0) > 1)[0]
    rows = np.where(m.sum(1) > 1)[0]
    if len(cols) == 0:
        print(f"{i:3d} -")
        continue
    x0, x1, y0, y1 = cols.min() + cx, cols.max() + cx, rows.min() + cy, rows.max() + cy
    ys, xs = np.nonzero(m)
    print(f"{i:3d} x {x0:4d}-{x1:4d} w {x1-x0:4d} cx {(xs.mean()+cx):7.1f} | y {y0:4d}-{y1:4d} h {y1-y0:3d} cy {(ys.mean()+cy):6.1f} | n {m.sum():6d}")
