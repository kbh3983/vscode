"""정보성 템플릿 미리보기(thumb_NN.png, 알파 포함)를 레퍼런스 장면 위에 올려 번호 붙인 시트로
  python thumb_sheet.py <ae 폴더> <배경 png> <out.jpg> <시작> <끝>
"""
import sys
from PIL import Image, ImageDraw, ImageFont
d, bgp, out, a, b = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
bg = Image.open(bgp).convert("RGBA").resize((1920, 1080))
try: font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 22)
except Exception: font = ImageFont.load_default()
ids = list(range(a, b + 1)); W, H = 960, 540; cols = 2; rows = (len(ids) + 1) // 2
sheet = Image.new("RGB", (W * cols, (H + 34) * rows), (25, 25, 25)); dr = ImageDraw.Draw(sheet)
for k, i in enumerate(ids):
    try: t = Image.open(f"{d}/thumb_{i:02d}.png").convert("RGBA").resize((1920, 1080))
    except Exception as e: print(i, e); continue
    im = bg.copy(); im.alpha_composite(t)
    x, y = (k % cols) * W, (k // cols) * (H + 34)
    sheet.paste(im.convert("RGB").resize((W, H)), (x, y))
    dr.text((x + 8, y + H + 5), f"{i:02d}", fill=(255, 230, 120), font=font)
sheet.save(out, quality=90); print(out)
