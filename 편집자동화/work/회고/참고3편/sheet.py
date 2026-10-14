"""참고 3편 — 카메라 구간 프레임 모음 (번호·시간·카메라·크기·길이·대사 앞부분)"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
H = os.path.dirname(os.path.abspath(__file__))
FT = ImageFont.truetype(r"C:\Windows\Fonts\malgunbd.ttf", 15)
W, HH, COLS = 400, 225, 4
for nm in ["기초체력", "스틱터틀볼", "둔근1"]:
    S = json.load(open(os.path.join(H, nm + "_cams.json"), encoding="utf-8"))
    rows = (len(S) + COLS - 1) // COLS
    for part in range(0, rows, 6):
        r = min(6, rows - part)
        sh = Image.new("RGB", (W * COLS, (HH + 40) * r), (25, 25, 25)); d = ImageDraw.Draw(sh)
        for k in range(part * COLS, min(len(S), (part + r) * COLS)):
            s = S[k]; f = os.path.join(H, "fr", "c%s_%02d0.png" % (nm[:2], k))
            if not os.path.exists(f): continue
            im = Image.open(f).convert("RGB").resize((W, HH))
            x, y = (k % COLS) * W, (k // COLS - part) * (HH + 40)
            sh.paste(im, (x, y))
            mo = s["mo"]
            col = (255, 220, 0) if s["cam"] == "cam1" else (0, 220, 255)
            m = s["s"]
            d.text((x + 4, y + HH + 1), f"#{k} {int(m // 60)}:{m % 60:04.1f} {s['cam']} {mo[0]}%{' 키' if mo[3] else ''} {s['len']:.1f}s", font=FT, fill=col)
            d.text((x + 4, y + HH + 20), s["said"][:30], font=FT, fill=(220, 220, 220))
        sh.save(os.path.join(H, f"sheet_{nm}_{part // 6}.jpg"), quality=82)
        print(nm, part // 6)
