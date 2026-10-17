"""정보성 템플릿 vs 레퍼런스: 레퍼런스 장면 위에 우리 템플릿(5초 프레임)을 빨간 윤곽으로 겹쳐 보기
  python compare_ref.py <ae 폴더> <ref 폴더> <out.jpg> <시작> <끝>
  - 왼쪽: 레퍼런스, 오른쪽: 레퍼런스 + 우리 템플릿 글자 윤곽(빨강) — 위치·크기·간격이 맞으면 레퍼런스 글자 위에 겹침
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
d, rd, out, a, b = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 30)
rows = []
for i in range(a, b + 1):
    ref = Image.open(f"{rd}/{i:02d}.png").convert("RGB").resize((1920, 1080))
    t = Image.open(f"{d}/v_{i:02d}.png").convert("RGBA").resize((1920, 1080))
    al = t.split()[3]
    edge = al.filter(ImageFilter.MaxFilter(3)); edge = Image.fromarray(((np.asarray(edge) > 100) & ~(np.asarray(al.filter(ImageFilter.MinFilter(3))) > 100)).astype(np.uint8) * 255)
    ov = ref.copy(); red = Image.new("RGB", ref.size, (255, 30, 30)); ov.paste(red, (0, 0), edge)
    row = Image.new("RGB", (1920 * 2, 1080)); row.paste(ref, (0, 0)); row.paste(ov, (1920, 0))
    ImageDraw.Draw(row).text((20, 20), f"{i:02d} 레퍼런스", fill=(255, 255, 0), font=font); ImageDraw.Draw(row).text((1940, 20), f"{i:02d} 겹침(빨강=우리)", fill=(255, 255, 0), font=font)
    rows.append(row.resize((1920, 540)))
s = Image.new("RGB", (1920, 540 * len(rows)))
for k, r in enumerate(rows): s.paste(r, (0, 540 * k))
s.save(out, quality=88); print(out)
