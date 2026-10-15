"""숏폼 에이전트 — shot_plan 결과를 원본 프레임에서 잘라 미리보기 시트로 (가운데 빨간 선, 위 7% 헤드룸 선)
  python shot_preview.py <plan.json> <원본 프레임 폴더> <out 폴더> [샘플 번호 0~2]
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

P = json.load(open(sys.argv[1], encoding="utf-8")); d, out = sys.argv[2], sys.argv[3]; q = int(sys.argv[4]) if len(sys.argv) > 4 else 1
os.makedirs(out, exist_ok=True)
font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 18)
T = []
for p in P:
    f = os.path.join(d, f"a{p['id']:03d}_{q}.jpg")
    if not os.path.exists(f) or not p.get("ok"): continue
    im = Image.open(f).crop(tuple(p["win"])).resize((270, 259))
    dr = ImageDraw.Draw(im); dr.line([(135, 0), (135, 259)], fill=(255, 0, 0)); dr.line([(0, 18), (270, 18)], fill=(0, 160, 255))
    lab = f"{p['id']} {p['shot']}" + (" !" if p["flag"] else "")
    dr.rectangle([0, 0, 8 + 10 * len(lab), 22], fill=(0, 0, 0)); dr.text((3, 0), lab, fill=(255, 255, 0) if not p["flag"] else (255, 80, 80), font=font)
    T.append(im)
for k in range(0, len(T), 40):
    sh = Image.new("RGB", (270 * 8, 259 * 5))
    for i, t in enumerate(T[k:k + 40]): sh.paste(t, ((i % 8) * 270, (i // 8) * 259))
    sh.save(os.path.join(out, f"p{k // 40}.jpg"), quality=85)
print(len(T))
