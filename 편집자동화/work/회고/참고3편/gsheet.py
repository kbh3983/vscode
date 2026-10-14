"""참고 3편 — 그래픽 렌더 모음 (번호·트랙·시간·길이·이름·키프레임)"""
import json, os
from PIL import Image, ImageDraw, ImageFont
H = os.path.dirname(os.path.abspath(__file__))
FT = ImageFont.truetype(r"C:\Windows\Fonts\malgunbd.ttf", 15)
G = json.load(open(os.path.join(H, "graphics.json"), encoding="utf-8"))
W, HH, COLS = 480, 270, 4
for nm in G:
    L = [(i, x) for i, x in enumerate(G[nm]) if os.path.exists(os.path.join(H, "gfx", "g%s_%02d0.png" % (nm[:2], i)))]
    for part in range(0, len(L), 24):
        P = L[part:part + 24]; rows = (len(P) + COLS - 1) // COLS
        sh = Image.new("RGB", (W * COLS, (HH + 22) * rows), (25, 25, 25)); d = ImageDraw.Draw(sh)
        for k, (i, x) in enumerate(P):
            im = Image.open(os.path.join(H, "gfx", "g%s_%02d0.png" % (nm[:2], i))).convert("RGB").resize((W, HH))
            px, py = (k % COLS) * W, (k // COLS) * (HH + 22)
            sh.paste(im, (px, py)); s = x["s"]
            d.text((px + 4, py + HH + 2), f"#{i} V{x['track'] + 1} {int(s // 60)}:{s % 60:05.2f} {x['len']:.1f}s {x['name'][:16]}{' 애니' if x['keys'] else ''}", font=FT, fill=(255, 220, 0))
        sh.save(os.path.join(H, f"gsheet_{nm}_{part // 24}.jpg"), quality=82); print(nm, part // 24)
