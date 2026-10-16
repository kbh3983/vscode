"""레퍼런스 분석 — 여러 영상에서 지정 시각 장면을 뽑아 번호·설명 붙인 견본 시트로
  python catalog.py <spec.json> <out.jpg> [열=4] [폭=480]
  spec.json: {"videos": {"r1": "<영상 경로>", ...}, "items": [["r1", 125.0, "설명"], ...]}
"""
import json, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

spec = json.load(open(sys.argv[1], encoding="utf-8")); out = sys.argv[2]
C = int(sys.argv[3]) if len(sys.argv) > 3 else 4; W = int(sys.argv[4]) if len(sys.argv) > 4 else 480; H = W * 9 // 16; CAP = 30
try: font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 17)
except Exception: font = ImageFont.load_default()
def grab(src, t):
    b = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", src, "-frames:v", "1", "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return Image.fromarray(np.frombuffer(b, np.uint8).reshape(H, W, 3)) if len(b) == W * H * 3 else Image.new("RGB", (W, H))
items = spec["items"]; R = (len(items) + C - 1) // C
sheet = Image.new("RGB", (C * W, R * (H + CAP)), (20, 20, 20)); d = ImageDraw.Draw(sheet)
for i, (v, t, label) in enumerate(items):
    x, y = (i % C) * W, (i // C) * (H + CAP)
    sheet.paste(grab(spec["videos"][v], t), (x, y))
    m, s = divmod(t, 60)
    d.text((x + 6, y + H + 5), f"{i + 1}. {v} {int(m):02d}:{s:04.1f}  {label}", fill=(255, 230, 120), font=font)
sheet.save(out, quality=88); print(out, len(items), "장")
