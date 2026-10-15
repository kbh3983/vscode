"""레퍼런스 분석 — 화면 글자와 설치된 폰트를 맞춰 보기 (같은 문구를 폰트마다 그려 모양 겹침으로 순위)
  python font_match.py <targets.json> <out 폴더>
  targets.json: [{"name","img","box":[x0,y0,x1,y1],"text","ink":"white"|"black","thr":200}]
점수 = 글자 영역(bbox)에 맞춰 늘린 뒤 IoU (굵기·글자 모양·자간이 맞을수록 높음). 상위 5개 비교 그림 저장
"""
import json, os, sys, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FD = [os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\Fonts"), r"C:\Windows\Fonts"]
fonts = [f for d in FD for f in glob.glob(os.path.join(d, "*")) if f.lower().endswith((".ttf", ".otf", ".ttc"))]

def has_hangul(path):
    try:
        f = ImageFont.truetype(path, 40); a = f.getmask("한").getbbox(); b = f.getmask("\uFFFF").getbbox()
        if not a: return False
        m1 = np.array(f.getmask("한")); m2 = np.array(f.getmask("글"))
        return m1.shape != m2.shape or (m1 != m2).any()
    except Exception: return False

def target_mask(t):
    a = np.asarray(Image.open(t["img"]).convert("RGB")).astype(int)
    x0, y0, x1, y1 = t["box"]; r = a[y0:y1, x0:x1]
    m = (r.min(2) > t.get("thr", 200)) if t["ink"] == "white" else (r.max(2) < t.get("thr", 70))
    ys, xs = np.nonzero(m); m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return m

def render(path, text, idx=0):
    f = ImageFont.truetype(path, 120, index=idx)
    w = int(f.getlength(text)) + 40
    im = Image.new("L", (w, 220), 0); ImageDraw.Draw(im).text((20, 40), text, font=f, fill=255)
    m = np.asarray(im) > 127; ys, xs = np.nonzero(m)
    if not len(ys): return None
    return m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def iou(a, b):
    bi = np.asarray(Image.fromarray(b.astype(np.uint8) * 255).resize((a.shape[1], a.shape[0]), Image.BILINEAR)) > 127
    return (a & bi).sum() / max(1, (a | bi).sum()), b.shape[1] / b.shape[0] / (a.shape[1] / a.shape[0])

T = json.load(open(sys.argv[1], encoding="utf-8")); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
cands = [f for f in fonts if has_hangul(f)]
print("한글 폰트", len(cands))
R = {}
for t in T:
    tm = target_mask(t); sc = []
    for f in cands:
        for idx in ([0, 1, 2, 3] if f.lower().endswith(".ttc") else [0]):
            try: m = render(f, t["text"], idx)
            except Exception: break
            if m is None: continue
            s, ar = iou(tm, m); sc.append((round(s - 0.6 * abs(np.log(ar)), 4), round(s, 3), round(ar, 3), os.path.basename(f), idx))
    sc.sort(reverse=True); R[t["name"]] = sc[:8]
    print("##", t["name"], t["text"]); [print("  ", x) for x in sc[:6]]
    rows = [Image.fromarray(tm.astype(np.uint8) * 255).convert("RGB")]
    for x in sc[:5]:
        f = [p for p in cands if os.path.basename(p) == x[3]][0]; m = render(f, t["text"], x[4])
        rows.append(Image.fromarray(m.astype(np.uint8) * 255).resize((tm.shape[1], tm.shape[0])).convert("RGB"))
    H = sum(r.height + 30 for r in rows); W = max(r.width for r in rows)
    sh = Image.new("RGB", (W, H), (40, 40, 40)); y = 0; d = ImageDraw.Draw(sh); fl = ImageFont.truetype(r"C:\Windows\Fonts\malgun.ttf", 20)
    labels = ["화면"] + [f"{x[3]} ({x[1]})" for x in sc[:5]]
    for r_, lb in zip(rows, labels): d.text((4, y + 2), lb, fill=(255, 255, 0), font=fl); sh.paste(r_, (0, y + 28)); y += r_.height + 30
    sh.save(os.path.join(out, t["name"] + ".png"))
json.dump(R, open(os.path.join(out, "result.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
