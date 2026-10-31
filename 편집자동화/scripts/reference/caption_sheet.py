"""captions.json 의 자막 crop 들을 시간순으로 한 장에 모음 (2026-10-27 놀심)
  python caption_sheet.py <분석 폴더> [최소px=0] [최대px=1e9] [이름=cap_sheet]
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; lo = float(sys.argv[2]) if len(sys.argv) > 2 else 0; hi = float(sys.argv[3]) if len(sys.argv) > 3 else 1e9
name = sys.argv[4] if len(sys.argv) > 4 else "cap_sheet"
font = ImageFont.truetype(next(p for p in ["C:/Windows/Fonts/malgunbd.ttf", "/System/Library/Fonts/AppleSDGothicNeo.ttc"] if os.path.exists(p)), 18)
C = [c for c in json.load(open(os.path.join(d, "captions.json"), encoding="utf-8")) if lo <= c["px"] <= hi]
RW, RH, PER = 960, 120, 14
for pg in range(0, len(C), PER):
    sheet = Image.new("RGB", (RW + 230, RH * PER), (40, 40, 40)); dr = ImageDraw.Draw(sheet)
    for k, c in enumerate(C[pg:pg + PER]):
        im = Image.open(os.path.join(d, "captions", c["img"])); im.thumbnail((RW, RH - 6))
        sheet.paste(im, (230, k * RH + 3))
        dr.text((6, k * RH + 6), f"{int(c['s']//60)}:{c['s']%60:05.2f}~{c['e']-c['s']:.2f}s", fill=(255, 230, 0), font=font)
        dr.text((6, k * RH + 32), f"y{c['box'][1]}-{c['box'][3]} px{c['px']}", fill=(200, 200, 200), font=font)
        dr.text((6, k * RH + 58), f"x{c['box'][0]}-{c['box'][2]}", fill=(200, 200, 200), font=font)
    sheet.save(os.path.join(d, f"{name}_{pg // PER:02d}.jpg"), quality=85)
print(len(C), "개", (len(C) + PER - 1) // PER, "장")
