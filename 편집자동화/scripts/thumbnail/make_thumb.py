"""유튜브 썸네일 만들기 (1920×1080) — 최박사 채널 레퍼런스 형식 (work/썸네일_제목/레퍼런스_분석.md)
실사 사진 + 아래 검정 그라데이션 + 큰 글자 2줄(흰/노랑, 검정 번짐 그림자) + 초록 점선 원 + (선택) 작은 윗줄·뱃지·말풍선
사용: python make_thumb.py <spec.json> <출력.png>
spec = {"photo": 경로, "crop": [x0, y0, w] (원본 비율 0~1, 16:9), "font": "pretendard|gmarket|paperlogy",
        "top": [[글자, 색], ...] (작은 윗줄, 조각별 색), "lines": [[[글자, 색], ...], ...] (큰 줄),
        "circles": [[cx, cy, r]] (1920 기준), "badge": 글자, "bubble": [글자, x, y], "bang": [x, y]}
색 이름: white / yellow / cyan / red
"""
import json, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

W, H = 1920, 1080
FONTS = {"pretendard": "~/Library/Fonts/Pretendard-Black.otf", "gmarket": "~/Library/Fonts/GmarketSansBold.otf",
         "paperlogy": "~/Library/Fonts/Paperlogy-9Black.ttf"}
COL = {"white": (255, 255, 255), "yellow": (253, 250, 7), "cyan": (0, 229, 255), "red": (226, 4, 4), "black": (0, 0, 0)}
GREEN = (16, 243, 116)
TRACK = -0.04   # 자간 (글자 크기 비율) — 레퍼런스처럼 좁게


def font(name, size):
    import os
    return ImageFont.truetype(os.path.expanduser(FONTS[name]), size)


def run_width(runs, f):
    text = "".join(t for t, _ in runs)
    return sum(f.getlength(ch) for ch in text) + TRACK * f.size * (len(text) - 1)


def draw_runs(d, runs, f, x, y, stroke=0):
    for t, c in runs:
        for ch in t:
            d.text((x, y), ch, font=f, fill=COL[c])
            x += f.getlength(ch) + TRACK * f.size


def outlined(base, runs, f, x, y, stroke):
    # 외곽선 = 글자 모양을 넓힌 검정 (글꼴 자체 stroke는 페이퍼로지에서 깨짐)
    m = Image.new("L", base.size, 0); dm = ImageDraw.Draw(m); xx = x
    for t, _ in runs:
        for ch in t:
            dm.text((xx, y), ch, font=f, fill=255); xx += f.getlength(ch) + TRACK * f.size
    m = m.filter(ImageFilter.MaxFilter(stroke * 2 + 1)).filter(ImageFilter.GaussianBlur(1.2))
    base.paste(Image.new("RGB", base.size, (0, 0, 0)), (0, 0), m)
    draw_runs(ImageDraw.Draw(base), runs, f, x, y)


def shadow_text(base, runs, f, x, y, blur, alpha=210):
    # 검정 번짐 그림자 → 글자
    sh = Image.new("L", base.size, 0)
    ds = ImageDraw.Draw(sh)
    xx = x
    for t, _ in runs:
        for ch in t:
            ds.text((xx, y), ch, font=f, fill=alpha, stroke_width=int(f.size * 0.06), stroke_fill=alpha)
            xx += f.getlength(ch) + TRACK * f.size
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    base.paste(Image.new("RGB", base.size, (0, 0, 0)), (0, 0), sh)
    draw_runs(ImageDraw.Draw(base), runs, f, x, y)


def dashed_circle(img, cx, cy, r, width=18, n=14, color=GREEN):
    d = ImageDraw.Draw(img)
    step = 360 / n
    for i in range(n):
        a0 = i * step
        d.arc((cx - r, cy - r, cx + r, cy + r), a0, a0 + step * 0.55, fill=color, width=width)


PS_FONT = {"pretendard": "Pretendard-Black", "gmarket": "GmarketSansBold", "paperlogy": "Paperlogy-9Black"}


def measure(runs, f, x, y):
    m = Image.new("L", (W, H), 0); dm = ImageDraw.Draw(m)
    for t, _ in runs:
        for ch in t:
            dm.text((x, y), ch, font=f, fill=255); x += f.getlength(ch) + TRACK * f.size
    return list(m.getbbox() or (0, 0, 0, 0))


def main(spec_path, out, layers_dir=None):
    from layers import new_layer, unpremul, composite, export
    S = json.load(open(spec_path, encoding="utf-8"))
    src = Image.open(S["photo"]).convert("RGB")
    sw, sh = src.size
    x0, y0, w = S["crop"]
    cw = w * sw; ch = cw * 9 / 16
    img = src.crop((int(x0 * sw), int(y0 * sh), int(x0 * sw + cw), int(y0 * sh + ch))).resize((W, H), Image.LANCZOS)
    if S.get("shift_up"):   # 인물·도구를 글자 위로 올림 — 아래 빈 곳은 검정(그라데이션에 묻힘)
        sh_ = S["shift_up"]; fade = Image.new("L", (W, H), 255); dfd = ImageDraw.Draw(fade)
        for yy in range(H - 320, H):   # 사진 아래 끝을 검정으로 부드럽게
            dfd.line([(0, yy), (W, yy)], fill=int(255 * max(0, (H - yy) / 320) ** 1.5))
        up = Image.new("RGB", (W, H), (0, 0, 0)); up.paste(img, (0, -sh_), fade); img = up
    img = ImageEnhance.Contrast(img).enhance(1.08)
    img = ImageEnhance.Color(img).enhance(1.12)
    L = [("사진", img.convert("RGBA"), "normal")]
    # 아래 검정 그라데이션 (레퍼런스: 아래 10% 밝기 14~48)
    g = Image.new("L", (1, H), 0)
    for yy in range(H):
        t = (yy / H - S.get("grad_start", 0.42)) / (1 - S.get("grad_start", 0.42))
        g.putpixel((0, yy), int(235 * max(0.0, min(1.0, t)) ** 1.3))
    gl_ = new_layer(); gl_.paste(Image.new("RGBA", (W, H), (0, 0, 0, 255)), (0, 0), g.resize((W, H))); L.append(("아래 어둡게", gl_, "normal"))
    for k, gl in enumerate(S.get("glows", [])):   # 근육 발광: [cx, cy, rx, ry, 각도] — 붉은 번짐 + 밝은 속 (스크린 합성)
        cx_, cy_, rx, ry, ang = gl
        lay = Image.new("RGB", (W, H), (0, 0, 0))
        e = Image.new("L", (rx * 4, ry * 4), 0)
        ImageDraw.Draw(e).ellipse((rx, ry, rx * 3, ry * 3), fill=255)
        e = e.rotate(ang, expand=False)
        m1 = Image.new("L", (W, H), 0); m1.paste(e, (cx_ - rx * 2, cy_ - ry * 2))
        outer = m1.filter(ImageFilter.GaussianBlur(max(rx, ry) * 0.45))
        inner = m1.filter(ImageFilter.GaussianBlur(max(rx, ry) * 0.15)).point(lambda v: int(v * 0.75))
        lay.paste(Image.new("RGB", (W, H), (255, 40, 0)), (0, 0), outer)
        lay.paste(Image.new("RGB", (W, H), (255, 150, 40)), (0, 0), inner)
        L.append((f"발광{k + 1}", lay.convert("RGBA"), "screen"))
    for k, ins in enumerate(S.get("insets", [])):   # 동그란 사진 (리액션 얼굴 등): [사진, [x0, y0, 크기](원본 비율), 중심x, 중심y, 지름]
        p_, (ix, iy, isz), cx_, cy_, dia = ins
        im2 = Image.open(p_).convert("RGB"); w2, h2 = im2.size
        sq = im2.crop((int(ix * w2), int(iy * h2), int(ix * w2 + isz * w2), int(iy * h2 + isz * w2))).resize((dia, dia), Image.LANCZOS)
        sq = ImageEnhance.Color(sq).enhance(1.12)
        mk = Image.new("L", (dia, dia), 0); ImageDraw.Draw(mk).ellipse((0, 0, dia - 1, dia - 1), fill=255)
        bd = 14
        lay = new_layer()
        ImageDraw.Draw(lay).ellipse((cx_ - dia // 2 - bd, cy_ - dia // 2 - bd, cx_ + dia // 2 + bd, cy_ + dia // 2 + bd), fill=(255, 255, 255))
        lay.paste(sq, (cx_ - dia // 2, cy_ - dia // 2), mk)
        L.append((f"동그란 사진{k + 1}", lay, "normal"))
    for k, c in enumerate(S.get("circles", [])):
        lay = new_layer(); dashed_circle(lay, *c); L.append((f"점선 원{k + 1}", lay, "normal"))
    fname = S.get("font", "pretendard")
    psf = PS_FONT[fname]
    texts = []
    tl = new_layer()
    # 큰 줄: 아래부터 쌓음, 폭 최대 1800, 줄 높이 최대 S["size"]
    margin, maxw = 60, W - 120
    y = H - S.get("bottom", 40)
    lines = S["lines"]
    sizes = []
    for runs in lines:
        size = S.get("size", 250)
        while run_width(runs, font(fname, size)) > maxw: size -= 4
        sizes.append(size)
    size = min(sizes) if S.get("same_size", True) else None
    blocks = []
    for runs, sz in zip(reversed(lines), reversed(sizes)):
        f = font(fname, size or sz)
        bb = f.getbbox("가")
        hgt = bb[3] - bb[1]
        y -= hgt
        x = (W - run_width(runs, f)) / 2 if S.get("center", True) else margin
        blocks.append((runs, f, x, y - bb[1]))
        y -= int(hgt * S.get("gap", 0.16))
    for k, (runs, f, x, yy) in enumerate(reversed(blocks)):
        shadow_text(tl, runs, f, x, yy, blur=int(f.size * 0.10))
        texts.append({"name": f"큰 글자{k + 1}", "runs": [[t, list(COL[c])] for t, c in runs], "font": psf, "size": f.size, "track": int(TRACK * 1000),
                      "italic": False, "bbox": measure(runs, f, x, yy), "shadow": {"size": int(f.size * 0.25), "spread": 15, "opacity": 82}})
    if S.get("top"):
        f = font(fname, S.get("top_size", 92))
        bb = f.getbbox("가")
        ty = S.get("top_y", y - (bb[3] - bb[1]) - 10)
        x = (W - run_width(S["top"], f)) / 2
        shadow_text(tl, S["top"], f, x, ty - bb[1], blur=12)
        texts.append({"name": "작은 윗줄", "runs": [[t, list(COL[c])] for t, c in S["top"]], "font": psf, "size": f.size, "track": int(TRACK * 1000),
                      "italic": False, "bbox": measure(S["top"], f, x, ty - bb[1]), "shadow": {"size": 26, "spread": 15, "opacity": 82}})
    if S.get("badge"):
        f = font(fname, 64); t = S["badge"]; tw = f.getlength(t)
        lay = new_layer(); ImageDraw.Draw(lay).rounded_rectangle((28, 28, 28 + tw + 56, 28 + 104), radius=22, fill=(255, 255, 255))
        L.append(("뱃지 바탕", lay, "normal"))
        ImageDraw.Draw(tl).text((56, 28 + 52), t, font=f, fill=(0, 0, 0), anchor="lm")
        m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).text((56, 28 + 52), t, font=f, fill=255, anchor="lm")
        texts.append({"name": "뱃지 글", "runs": [[t, [0, 0, 0]]], "font": psf, "size": 64, "track": 0, "italic": False, "bbox": list(m.getbbox())})
    if S.get("bubble"):
        t, bx, by = S["bubble"]
        f = font(fname, S.get("bubble_size", 96))
        outlined(tl, [[t, "white"]], f, bx, by, stroke=int(f.size * 0.11))
        texts.append({"name": "말 글", "runs": [[t, [255, 255, 255]]], "font": psf, "size": f.size, "track": int(TRACK * 1000), "italic": False,
                      "bbox": measure([[t, "white"]], f, bx, by), "stroke": {"size": int(f.size * 0.11), "color": [0, 0, 0]}})
    if S.get("bang"):
        bx, by = S["bang"]
        f = font(fname, 170)
        outlined(tl, [["!!!!", "white"]], f, bx, by, stroke=14)
        texts.append({"name": "!!!!", "runs": [["!!!!", [255, 255, 255]]], "font": psf, "size": 170, "track": int(TRACK * 1000), "italic": False,
                      "bbox": measure([["!!!!", "white"]], f, bx, by), "stroke": {"size": 14, "color": [0, 0, 0]}})
    flat = composite(L + [("글자", unpremul(tl), "normal")])
    flat.save(out)
    flat.save(out.rsplit(".", 1)[0] + ".jpg", quality=92)
    if layers_dir:
        export(layers_dir, L, texts)
    print(out, size or sizes)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
