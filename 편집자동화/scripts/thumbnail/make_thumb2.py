"""유튜브 썸네일 2판 (1920×1080) — 2차 레퍼런스(틀어진골반·목교정기·하체루틴) 방식 (work/썸네일_제목/레퍼런스_분석.md)
실사 + 아래 그라데이션 + 페이퍼로지 Black 기울임 큰 글자(빨강 문제 / 노랑 해결 / 흰) + 초록 속마음 글(검정 외곽선)
+ 해부도 원(같은 장면 확대 위에 코드로 그린 척추·골반·대퇴골·둔근 + 붉은 발광, 빨간 링) + 빨간 3D 화살표 + 점선 원
사용: python make_thumb2.py <spec.json> <출력.png>
"""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageChops

W, H = 1920, 1080
FONT = os.path.expanduser("~/Library/Fonts/Paperlogy-9Black.ttf")
COL = {"white": (255, 255, 255), "yellow": (236, 239, 0), "red": (242, 0, 0), "green": (1, 251, 23), "black": (0, 0, 0)}
SLANT = 0.18          # 기울임 (약 10°)
TRACK = -0.03
BONE, BONE_D, BONE_L, BONE_O = (236, 224, 200), (196, 176, 146), (250, 244, 230), (110, 88, 62)
HOT = (255, 70, 40)


def font(size):
    return ImageFont.truetype(FONT, size)


# ---------- 글자 ----------
def text_layer(runs, size, outline=0, outline_col=(0, 0, 0)):
    """runs=[[글자, 색]] → 기울인 RGBA 한 덩어리 (외곽선 포함)"""
    f = font(size)
    text = "".join(t for t, _ in runs)
    wid = int(sum(f.getlength(c) for c in text) + TRACK * size * (len(text) - 1)) + size
    hei = int(size * 1.5)
    pad = outline + int(size * SLANT) + 10
    lay = Image.new("RGBA", (wid + pad * 2, hei + pad * 2), (0, 0, 0, 0))
    mask = Image.new("L", lay.size, 0)
    d = ImageDraw.Draw(lay); dm = ImageDraw.Draw(mask)
    x = pad
    pos = []
    for t, c in runs:
        for ch in t:
            pos.append((x, ch, c)); x += f.getlength(ch) + TRACK * size
    for x_, ch, c in pos:
        dm.text((x_, pad), ch, font=f, fill=255)
    if outline:
        om = mask.filter(ImageFilter.MaxFilter(outline * 2 + 1)).filter(ImageFilter.GaussianBlur(1))
        lay.paste(Image.new("RGBA", lay.size, outline_col + (255,)), (0, 0), om)
    for x_, ch, c in pos:
        d.text((x_, pad), ch, font=f, fill=COL[c] + (255,))
    # 기울임: 위쪽을 오른쪽으로
    h_ = lay.size[1]
    T_ = ((lay.size[0] + int(h_ * SLANT), h_), Image.AFFINE, (1, SLANT, -SLANT * h_, 0, 1, 0), Image.BICUBIC)
    lay = lay.transform(*T_); gm = mask.transform(*T_)
    bb = lay.getbbox() or (0, 0) + lay.size
    ib = gm.getbbox() or bb
    text_layer.inner = (ib[0] - bb[0], ib[1] - bb[1], ib[2] - bb[0], ib[3] - bb[1])   # 외곽선 뺀 글자 범위 (포토샵 배치용)
    return lay.crop(bb)


def paste_shadowed(base, lay, x, y, blur, alpha=200):
    a = lay.split()[3].point(lambda v: min(255, v) * alpha // 255)
    sh = Image.new("L", base.size, 0); sh.paste(a, (int(x), int(y)))
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    base.paste(Image.new("RGB", base.size, (0, 0, 0)), (0, 0), sh)
    base.paste(lay, (int(x), int(y)), lay)


# ---------- 그래픽 ----------
def dashed_circle(img, cx, cy, r, color, width=16, n=16, edge=True):
    d = ImageDraw.Draw(img)
    step = 360 / n
    for i in range(n):
        a0 = i * step
        if edge:
            d.arc((cx - r, cy - r, cx + r, cy + r), a0 - 1.2, a0 + step * 0.55 + 1.2, fill=(255, 255, 255), width=width + 10)
    for i in range(n):
        a0 = i * step
        d.arc((cx - r, cy - r, cx + r, cy + r), a0, a0 + step * 0.55, fill=COL[color], width=width)


def bez(p0, c, p1, t):
    return ((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1])


def arrow3d(img, p0, p1, bend=0.35, width=46):
    """빨간 3D 곡선 화살표 (흰 테두리 + 아래 진한 그림자)"""
    mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    L = math.hypot(dx, dy)
    c = (mx - dy * bend, my + dx * bend)
    N = 40
    pts = [bez(p0, c, p1, i / N) for i in range(N + 1)]
    head = width * 1.9
    # 몸통 끝은 머리 시작까지
    tot = 0; seg = [0]
    for i in range(1, len(pts)): tot += math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.append(tot)
    cut = next(i for i, s in enumerate(seg) if s >= tot - head * 0.9)
    left, right = [], []
    for i in range(cut + 1):
        a = pts[max(0, i - 1)]; b = pts[min(len(pts) - 1, i + 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]; tl = math.hypot(tx, ty) or 1
        nx, ny = -ty / tl, tx / tl
        w = width * (0.35 + 0.65 * i / cut) / 2
        left.append((pts[i][0] + nx * w, pts[i][1] + ny * w)); right.append((pts[i][0] - nx * w, pts[i][1] - ny * w))
    a = pts[cut]; tip = pts[-1]
    tx, ty = tip[0] - a[0], tip[1] - a[1]; tl = math.hypot(tx, ty) or 1
    nx, ny = -ty / tl, tx / tl
    hw = width * 1.05
    headp = [(a[0] + nx * hw, a[1] + ny * hw), (tip[0] + tx / tl * width * 0.2, tip[1] + ty / tl * width * 0.2), (a[0] - nx * hw, a[1] - ny * hw)]
    body = left + right[::-1]
    def shape(dxo, dyo, col, grow=0):
        lay = Image.new("L", img.size, 0); dl = ImageDraw.Draw(lay)
        dl.polygon([(x + dxo, y + dyo) for x, y in body], fill=255); dl.polygon([(x + dxo, y + dyo) for x, y in headp], fill=255)
        if grow: lay = lay.filter(ImageFilter.MaxFilter(grow * 2 + 1))
        img.paste(Image.new("RGB", img.size, col), (0, 0), lay)
    sh = Image.new("L", img.size, 0); dl = ImageDraw.Draw(sh)
    dl.polygon([(x + 6, y + 10) for x, y in body], fill=150); dl.polygon([(x + 6, y + 10) for x, y in headp], fill=150)
    img.paste(Image.new("RGB", img.size, (0, 0, 0)), (0, 0), sh.filter(ImageFilter.GaussianBlur(8)))
    shape(0, 0, (255, 255, 255), grow=5)
    shape(0, 7, (140, 0, 0))
    shape(0, 0, (232, 12, 12))
    # 위쪽 하이라이트
    hl = Image.new("L", img.size, 0); dh = ImageDraw.Draw(hl)
    dh.line([(x, y - width * 0.12) for x, y in [pts[i] for i in range(2, cut)]], fill=110, width=max(3, width // 6))
    img.paste(Image.new("RGB", img.size, (255, 140, 120)), (0, 0), hl.filter(ImageFilter.GaussianBlur(2)))


# ---------- 해부도 (원 안, 좌표는 원 안 0~1) ----------
def rot(pts, ang, c):
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    return [(c[0] + x * ca - y * sa, c[1] + x * sa + y * ca) for x, y in pts]


def bone_poly(d, pts, hot=False):
    d.polygon(pts, fill=BONE, outline=BONE_O)
    # 안쪽 밝은 면 (중심 쪽으로 줄임)
    cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
    inner = [(cx + (x - cx) * 0.62 - 2, cy + (y - cy) * 0.62 - 3) for x, y in pts]
    d.polygon(inner, fill=BONE_L)
    d.line(pts + [pts[0]], fill=BONE_O, width=3)


def draw_spine(layer, glow, D, pts, n, w, back, hot):
    d = ImageDraw.Draw(layer); g = ImageDraw.Draw(glow)
    P = [(x * D, y * D) for x, y in pts]
    # 경로를 n등분
    seg = [0]
    for i in range(1, len(P)): seg.append(seg[-1] + math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]))
    tot = seg[-1]
    def at(s):
        for i in range(1, len(P)):
            if s <= seg[i]:
                t = (s - seg[i - 1]) / ((seg[i] - seg[i - 1]) or 1)
                return (P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t), math.degrees(math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]))
        return P[-1], math.degrees(math.atan2(P[-1][1] - P[-2][1], P[-1][0] - P[-2][0]))
    step = tot / n
    hgt = step * 0.72; wid = w * D
    # 척추 뒤 근육(척추기립근) — 붉게 비치는 띠
    mus = Image.new("RGBA", layer.size, (0, 0, 0, 0)); dmu = ImageDraw.Draw(mus)
    back_pts = []
    for i in range(0, 41):
        (px, py), ang_ = at(tot * i / 40)
        back_pts.append((px - math.sin(math.radians(ang_)) * back * wid * 0.75, py + math.cos(math.radians(ang_)) * back * wid * 0.75))
    dmu.line(back_pts, fill=(205, 55, 45, 150), width=int(wid * 1.7), joint="curve")
    for i in range(1, 40, 2):
        dmu.line([back_pts[i - 1], back_pts[i + 1]], fill=(150, 30, 25, 120), width=3)
    layer.alpha_composite(mus.filter(ImageFilter.GaussianBlur(2)))
    for i in range(n):
        (cx, cy), ang = at(step * (i + 0.5))
        # 디스크
        if i < n - 1:
            (dx_, dy_), _ = at(step * (i + 1))
            disc = rot([(-step * 0.14, -wid * 0.45), (step * 0.14, -wid * 0.45), (step * 0.14, wid * 0.45), (-step * 0.14, wid * 0.45)], ang, (dx_, dy_))
            d.polygon(disc, fill=(150, 175, 205), outline=(90, 110, 140))
        body = rot([(-hgt / 2, -wid / 2), (hgt / 2, -wid / 2), (hgt / 2, wid / 2), (-hgt / 2, wid / 2)], ang, (cx, cy))
        spin = rot([(-hgt * 0.25, back * wid * 0.45), (hgt * 0.25, back * wid * 0.45), (hgt * 0.05, back * wid * 1.15), (-hgt * 0.45, back * wid * 1.05)], ang, (cx, cy))
        bone_poly(d, spin); bone_poly(d, body)
        if i in hot:
            g.ellipse((cx - wid * 1.1, cy - wid * 1.1, cx + wid * 1.1, cy + wid * 1.1), fill=255)


def draw_pelvis(layer, glow, D, c, s, ang, flip, hot):
    d = ImageDraw.Draw(layer); g = ImageDraw.Draw(glow)
    k = -1 if flip else 1
    S = s * D
    wing = [(-0.95, -0.95), (-0.35, -1.25), (0.35, -1.12), (0.78, -0.62), (0.62, -0.18), (0.42, 0.2), (0.38, 0.62), (0.05, 0.98), (-0.42, 1.0), (-0.62, 0.62), (-0.5, 0.22), (-0.9, -0.3)]
    wing = rot([(k * x * S, y * S) for x, y in wing], ang, (c[0] * D, c[1] * D))
    sac = rot([(k * x * S, y * S) for x, y in [(-1.15, -0.75), (-0.82, -0.85), (-0.7, 0.2), (-0.95, 0.65), (-1.12, 0.3)]], ang, (c[0] * D, c[1] * D))
    bone_poly(d, sac); bone_poly(d, wing)
    # 폐쇄공·관골구
    ob = rot([(k * x * S, y * S) for x, y in [(-0.25, 0.45), (0.05, 0.4), (0.12, 0.7), (-0.2, 0.78)]], ang, (c[0] * D, c[1] * D))
    d.polygon(ob, fill=BONE_D, outline=BONE_O)
    ax, ay = rot([(k * 0.18 * S, 0.12 * S)], ang, (c[0] * D, c[1] * D))[0]
    r = 0.3 * S
    d.ellipse((ax - r, ay - r, ax + r, ay + r), fill=BONE_D, outline=BONE_O, width=4)
    if hot:
        g.ellipse((ax - r * 1.6, ay - r * 1.6, ax + r * 1.6, ay + r * 1.6), fill=255)
    return (ax, ay)


def draw_femur(layer, glow, D, a, b, r, hot):
    d = ImageDraw.Draw(layer); g = ImageDraw.Draw(glow)
    ax, ay = a[0] * D, a[1] * D; bx, by = b[0] * D, b[1] * D
    R = r * D
    ang = math.degrees(math.atan2(by - ay, bx - ax)); L = math.hypot(bx - ax, by - ay)
    shaft = rot([(R * 0.6, -R * 0.55), (L, -R * 0.5), (L + R * 0.2, -R * 0.95), (L + R * 0.95, -R * 0.7), (L + R * 0.95, R * 0.75), (L + R * 0.2, R * 0.95), (L, R * 0.5), (R * 1.4, R * 0.62), (R * 0.9, R * 1.2), (R * 0.4, R * 0.7)], ang, (ax, ay))
    bone_poly(d, shaft)
    d.ellipse((ax - R, ay - R, ax + R, ay + R), fill=BONE, outline=BONE_O, width=3)
    d.ellipse((ax - R * 0.55 - 3, ay - R * 0.6 - 4, ax + R * 0.35, ay + R * 0.3), fill=BONE_L)
    if hot:
        g.ellipse((ax - R * 1.7, ay - R * 1.7, ax + R * 1.7, ay + R * 1.7), fill=255)


def draw_glute(layer, glow, D, c, rx, ry, ang):
    lay = Image.new("RGBA", layer.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    cx, cy, RX, RY = c[0] * D, c[1] * D, rx * D, ry * D
    pts = [(RX * math.cos(t / 30 * math.pi * 2), RY * math.sin(t / 30 * math.pi * 2)) for t in range(30)]
    poly = rot(pts, ang, (cx, cy))
    d.polygon(poly, fill=(200, 50, 45, 215), outline=(120, 15, 15, 255))
    for i in range(-4, 5):   # 근섬유 결
        p0 = rot([(-RX * 0.85, i * RY * 0.18)], ang + 25, (cx, cy))[0]; p1 = rot([(RX * 0.85, i * RY * 0.18)], ang + 25, (cx, cy))[0]
        d.line([p0, p1], fill=(150, 25, 25, 160), width=3)
    m = Image.new("L", layer.size, 0); ImageDraw.Draw(m).polygon(poly, fill=255)
    lay.putalpha(ImageChops.multiply(lay.split()[3], m))
    layer.alpha_composite(lay)
    ImageDraw.Draw(glow).polygon(poly, fill=255)


def anatomy_inset(img, src_img, spec):
    cx4, cy4, s4 = spec["src"]
    D = spec["dia"]
    sq = src_img.crop((cx4 - s4, cy4 - s4, cx4 + s4, cy4 + s4)).resize((D, D), Image.LANCZOS)
    sq = ImageEnhance.Brightness(ImageEnhance.Color(sq).enhance(0.85)).enhance(0.92)
    layer = Image.new("RGBA", (D, D), (0, 0, 0, 0)); glow = Image.new("L", (D, D), 0)
    for a in spec.get("anatomy", []):
        t = a["type"]
        if t == "spine": draw_spine(layer, glow, D, a["pts"], a.get("n", 6), a.get("w", 0.08), a.get("back", -1), a.get("hot", []))
        if t == "pelvis": draw_pelvis(layer, glow, D, a["c"], a["s"], a.get("ang", 0), a.get("flip", False), a.get("hot", False))
        if t == "femur": draw_femur(layer, glow, D, a["a"], a["b"], a.get("r", 0.05), a.get("hot", False))
        if t == "glute": draw_glute(layer, glow, D, a["c"], a["rx"], a["ry"], a.get("ang", 0))
    # 몸이 비치는 느낌: 뼈 아래 어둡게 번짐
    sh = layer.split()[3].filter(ImageFilter.GaussianBlur(10)).point(lambda v: v * 0.55)
    sq.paste(Image.new("RGB", (D, D), (40, 20, 10)), (0, 0), sh)
    lay2 = layer.copy(); lay2.putalpha(layer.split()[3].point(lambda v: int(v * spec.get("opacity", 0.93))))
    sq.paste(lay2, (0, 0), lay2)
    # 붉은 발광 (화면 합성)
    g1 = glow.filter(ImageFilter.GaussianBlur(D * 0.05)); g2 = glow.filter(ImageFilter.GaussianBlur(D * 0.018))
    gl = Image.new("RGB", (D, D), (0, 0, 0))
    gl.paste(Image.new("RGB", (D, D), (255, 30, 0)), (0, 0), g1)
    gl.paste(Image.new("RGB", (D, D), (255, 120, 60)), (0, 0), g2.point(lambda v: v * 0.6))
    sq = ImageChops.screen(sq, gl)
    # 원으로 자르고 빨간 링
    m = Image.new("L", (D, D), 0); ImageDraw.Draw(m).ellipse((0, 0, D - 1, D - 1), fill=255)
    X, Y = spec["center"]; x0, y0 = X - D // 2, Y - D // 2
    shd = Image.new("L", img.size, 0); ImageDraw.Draw(shd).ellipse((x0 - 10, y0 + 4, x0 + D + 14, y0 + D + 22), fill=170)
    img.paste(Image.new("RGB", img.size, (0, 0, 0)), (0, 0), shd.filter(ImageFilter.GaussianBlur(18)))
    img.paste(sq, (x0, y0), m)
    ring = spec.get("ring", 24)
    ImageDraw.Draw(img).ellipse((x0 - ring // 2, y0 - ring // 2, x0 + D + ring // 2, y0 + D + ring // 2), outline=COL["red"], width=ring)


def main(spec_path, out, layers_dir=None):
    from layers import new_layer, unpremul, composite, export
    S = json.load(open(spec_path, encoding="utf-8"))
    src = Image.open(S["photo"]).convert("RGB")
    sw, sh_ = src.size
    x0, y0, w = S["crop"]
    cw = w * sw; ch = cw * 9 / 16
    img = src.crop((int(x0 * sw), int(y0 * sh_), int(x0 * sw + cw), int(y0 * sh_ + ch))).resize((W, H), Image.LANCZOS)
    img = ImageEnhance.Contrast(img).enhance(1.08); img = ImageEnhance.Color(img).enhance(1.1)
    if S.get("flip"): img = img.transpose(Image.FLIP_LEFT_RIGHT)
    L = [("사진", img.convert("RGBA"), "normal")]
    gs = S.get("grad_start", 0.55)
    g = Image.new("L", (1, H), 0)
    for yy in range(H):
        t = (yy / H - gs) / (1 - gs)
        g.putpixel((0, yy), int(240 * max(0.0, min(1.0, t)) ** 1.25))
    gl = new_layer(); gl.paste(Image.new("RGBA", (W, H), (0, 0, 0, 255)), (0, 0), g.resize((W, H))); L.append(("아래 어둡게", gl, "normal"))
    for i, c in enumerate(S.get("dcircles", [])):
        lay = new_layer(); dashed_circle(lay, c[0], c[1], c[2], c[3]); L.append((f"점선 원{i + 1}", unpremul(lay), "normal"))
    for i, dl in enumerate(S.get("dlines", [])):   # 점선 자세선: [[점들], 색]
        pts, col = dl
        lay = new_layer(); dd = ImageDraw.Draw(lay)
        for k_ in range(len(pts) - 1):
            a, b = pts[k_], pts[k_ + 1]
            ln = math.hypot(b[0] - a[0], b[1] - a[1]); n = max(1, int(ln / 46))
            for k in range(n):
                t0, t1 = k / n, (k + 0.55) / n
                p, q = (a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0), (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)
                dd.line([p, q], fill=(255, 255, 255), width=26); dd.line([p, q], fill=COL[col], width=15)
        L.append((f"점선{i + 1}", lay, "normal"))
    if S.get("inset"):
        lay = new_layer(); anatomy_inset(lay, src, S["inset"]); L.append(("해부도 원", unpremul(lay), "normal"))
    for i, a in enumerate(S.get("arrows", [])):
        lay = new_layer(); arrow3d(lay, a[0], a[1], a[2] if len(a) > 2 else 0.35); L.append((f"화살표{i + 1}", unpremul(lay), "normal"))
    texts = []
    # 큰 글자 (아래부터)
    y = H - S.get("bottom", 36)
    maxw = W - 100
    blocks = []
    for runs in reversed(S["lines"]):
        size = S.get("size", 210)
        while True:
            lay = text_layer(runs, size)
            if lay.size[0] <= maxw: break
            size -= 6
        y -= lay.size[1]
        x = (W - lay.size[0]) / 2 if S.get("center", True) else 50
        blocks.append((lay, x, y, runs, size, text_layer.inner)); y -= int(size * S.get("gap", 0.06))
    tl = new_layer()
    for k, (lay, x, yy, runs, size, ib) in enumerate(reversed(blocks)):
        paste_shadowed(tl, lay, x, yy, blur=16)
        texts.append({"name": f"큰 글자{k + 1}", "runs": [[t, list(COL[c])] for t, c in runs], "font": "Paperlogy-9Black", "size": size,
                      "track": int(TRACK * 1000), "italic": True, "bbox": [x + ib[0], yy + ib[1], x + ib[2], yy + ib[3]],
                      "shadow": {"size": 32, "spread": 8, "opacity": 80}})
    for k, gt in enumerate(S.get("green", [])):   # 초록 속마음: [글자, x, y, 크기, 회전]
        t, gx, gy, gsz = gt[:4]
        lay = text_layer([[t, "green"]], gsz, outline=int(gsz * 0.1)); ib = text_layer.inner
        if len(gt) > 4 and gt[4]: lay = lay.rotate(gt[4], expand=True, resample=Image.BICUBIC)
        paste_shadowed(tl, lay, gx, gy, blur=6, alpha=120)
        texts.append({"name": f"초록 글{k + 1}", "runs": [[t, list(COL["green"])]], "font": "Paperlogy-9Black", "size": gsz,
                      "track": int(TRACK * 1000), "italic": True, "bbox": [gx + ib[0], gy + ib[1], gx + ib[2], gy + ib[3]],
                      "stroke": {"size": int(gsz * 0.1), "color": [0, 0, 0]}, "shadow": {"size": 12, "spread": 0, "opacity": 45}, "rotate": gt[4] if len(gt) > 4 else 0})
    flat = composite(L + [("글자", unpremul(tl), "normal")])
    flat.save(out); flat.save(out.rsplit(".", 1)[0] + ".jpg", quality=92)
    if layers_dir:
        export(layers_dir, L, texts)
    print(out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
