"""레퍼런스 분석 — 구간을 일정 간격(또는 지정 시각들)으로 뽑아 시각 표시가 붙은 시트로
  python sheet.py <영상> <out 접두> <시작초> <끝초> <초당 장수> [열=8] [행=6] [폭=320]
  python sheet.py <영상> <out 접두> --times <t1,t2,...> [열] [행] [폭]
  python sheet.py <영상> <out 접두> --fps-all <초당 장수> [열] [행] [폭]   (전체, ffmpeg 한 번)
"""
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

src, pre = sys.argv[1], sys.argv[2]
font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 16)
def grab(t, w):
    h = w * 9 // 16
    b = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1", "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return Image.fromarray(np.frombuffer(b, np.uint8).reshape(h, w, 3)) if len(b) == w * h * 3 else Image.new("RGB", (w, h))
def tc(t): m, s = divmod(t, 60); return f"{int(m):02d}:{s:05.2f}"
FAST = None
if sys.argv[3] == "--fps-all":   # 처음부터 끝까지 초당 N장, ffmpeg 한 번에 (빠름)
    fpsn = float(sys.argv[4]); rest = sys.argv[5:]
    w0 = int(rest[2]) if len(rest) > 2 else 320; h0 = w0 * 9 // 16
    pr = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-vf", f"fps={fpsn},scale={w0}:{h0}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    FAST = []
    while True:
        b = pr.stdout.read(w0 * h0 * 3)
        if len(b) < w0 * h0 * 3: break
        FAST.append(Image.fromarray(np.frombuffer(b, np.uint8).reshape(h0, w0, 3)))
    T = [i / fpsn for i in range(len(FAST))]
elif sys.argv[3] == "--times":
    T = [float(x) for x in sys.argv[4].split(",")]; rest = sys.argv[5:]
else:
    a, b, fps = float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]); rest = sys.argv[6:]
    T = list(np.arange(a, b, 1 / fps))
cols = int(rest[0]) if len(rest) > 0 else 8; rows = int(rest[1]) if len(rest) > 1 else 6; w = int(rest[2]) if len(rest) > 2 else 320
h = w * 9 // 16; per = cols * rows
os.makedirs(os.path.dirname(pre) or ".", exist_ok=True)
for k in range(0, len(T), per):
    sh = Image.new("RGB", (cols * w, rows * h))
    for i, t in enumerate(T[k:k + per]):
        im = FAST[k + i].copy() if FAST is not None else grab(t, w); d = ImageDraw.Draw(im); lab = tc(t)
        d.rectangle([0, 0, 9 * len(lab) + 6, 20], fill=(0, 0, 0)); d.text((3, 1), lab, fill=(255, 255, 0), font=font)
        sh.paste(im, ((i % cols) * w, (i // cols) * h))
    sh.save(f"{pre}_{k // per:02d}.jpg", quality=85)
print(len(T), "장")
