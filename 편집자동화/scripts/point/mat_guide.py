"""운동 위치 안내 자료화면 — 매트 위에서 본 그림 + 발 위치 + 스틱 원 (1920×1080 투명 PNG, 오른쪽 위 판)
레퍼런스: 최박사 모닝루틴 "벽 터치 힙힌지" 오른쪽 매트·발 그림 (2026-10-27 사용자 첨부)
사용: python mat_guide.py <spec.json> <출력.png>
spec = {"feet": [[x, y, "L"|"R", 투명도(0~1)]], "stick": [x, y], "arrows": [[x0, y, x1]], "box": [x, y, w, h]}
좌표 x·y = 매트 안 비율 (x 0 = 화면 왼쪽 끝, y 0 = 매트 뒤쪽 / 1 = 카메라 쪽). 매트는 카메라에서 본 방향 그대로(가로로 긴 매트)
"""
import json, math, sys
from PIL import Image, ImageDraw, ImageFilter

W, H = 1920, 1080
S = 2   # 2배로 그린 뒤 줄여 테두리를 부드럽게


ART = "/Users/bbong/dada/상상스퀘어/최박사/"   # 사용자 자료: 매트.png(세로, 반투명 판 + 흰 무늬), 왼발.png·오른발.png (2026-10-27)


def main_art(sp, out):
    """사용자 자료 그림으로: 매트를 90° 돌려 화면 속 매트처럼 가로로, 발은 180° 돌려 발가락이 카메라 쪽
    좌표 x·y = 돌린 매트 그림 안 비율 (모서리 점: x 0.089·0.328·0.711·0.937, y 0.212·0.786)"""
    bx, by, bw = sp.get("box", [1150, 55, 740, 0])[:3]
    mat = Image.open(ART + "매트.png").convert("RGBA")
    if sp.get("rot", 90): mat = mat.rotate(sp.get("rot", 90), expand=True)
    mh = sp["box"][3] if len(sp.get("box", [])) > 3 and sp["box"][3] else round(bw * mat.size[1] / mat.size[0])
    mat = mat.resize((bw, mh), Image.LANCZOS)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    parts = []   # (이름, 레이어) — 요소별 PNG (2026-10-27 사용자: "왼발 오른발, 스틱 요소 다 레이어 분리해줘")
    def part(name):
        L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); parts.append((name, L)); return L
    sh = Image.new("L", (W, H), 0)
    ImageDraw.Draw(sh).rounded_rectangle((bx + 10, by + 10, bx + bw - 6, by + mh - 4), 26, fill=70)
    part("매트").alpha_composite(mat, (bx, by))   # 그림자 없음 (레퍼런스처럼)
    P = lambda x, y: (bx + bw * x, by + mh * y)
    fh = sp.get("foot_h", 0.36) * mh
    ARR = sp.get("arrows_v", [])
    for fx, fy, side, op in sp.get("feet", []):
        f = Image.open(ART + ("오른발.png" if side == "R" else "왼발.png")).convert("RGBA")
        f = f.crop(f.split()[3].getbbox()).rotate(sp.get("foot_rot", 180), expand=True)
        if sp.get("foot_px"):   # 발 길이(px)를 직접 (레퍼런스 239px)
            L = sp["foot_px"]; f = f.resize((round(L * f.size[0] / max(f.size)), round(L * f.size[1] / max(f.size))), Image.LANCZOS)
        else:
            f = f.resize((round(fh * f.size[0] / f.size[1]), round(fh)), Image.LANCZOS)
        if op < 1: f.putalpha(f.split()[3].point(lambda v: int(v * op)))
        cx, cy = P(fx, fy); part(("오른발" if side == "R" else "왼발") + ("_움직임" if op < 1 else "")).alpha_composite(f, (round(cx - f.size[0] / 2), round(cy - f.size[1] / 2)))
    d = ImageDraw.Draw(img)
    for ar in sp.get("arrows", []):
        d = ImageDraw.Draw(part("화살표"))   # [x0, y, x1] 가로 또는 [x0, y0, x1, y1]
        if len(ar) == 3: ar = [ar[0], ar[1], ar[2], ar[1]]
        a, b = P(ar[0], ar[1]), P(ar[2], ar[3])
        L_ = math.hypot(b[0] - a[0], b[1] - a[1]) or 1; ux, uy = (b[0] - a[0]) / L_, (b[1] - a[1]) / L_
        d.line([a, b], fill=(255, 230, 0, 255), width=7)
        for q, sgn in ((a, -1), (b, 1)):
            hx, hy = 18 * sgn * ux, 18 * sgn * uy; nx, ny = -uy * 14, ux * 14
            d.polygon([(q[0] + hx, q[1] + hy), (q[0] - hx * 0.2 + nx, q[1] - hy * 0.2 + ny), (q[0] - hx * 0.2 - nx, q[1] - hy * 0.2 - ny)], fill=(255, 230, 0, 255))
    if sp.get("stick"):
        cx, cy = P(*sp["stick"]); r = 19
        d = ImageDraw.Draw(part("스틱"))
        d.ellipse((cx - r - 5, cy - r - 5, cx + r + 5, cy + r + 5), fill=(255, 255, 255, 255))
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(90, 70, 55, 255))   # 스틱 바닥면 갈색 한 색 (2026-10-27 사용자: 연두+갈색 → 갈색 하나로)
    import os
    base = out.rsplit(".", 1)[0]; info = []
    for name, L in parts:
        img.alpha_composite(L)
        bb = L.split()[3].getbbox()
        if not bb: continue
        L.crop(bb).save(f"{base}_{name}.png")   # 요소 크기로 잘라 저장 → 프리미어에서 그 요소 중심 기준으로 이동·크기 조절
        info.append({"name": name, "file": os.path.basename(f"{base}_{name}.png"), "cx": (bb[0] + bb[2]) / 2, "cy": (bb[1] + bb[3]) / 2})
    json.dump(info, open(base + "_parts.json", "w", encoding="utf-8"), ensure_ascii=False)
    img.save(out)
    print(out, [p["name"] for p in info])


def main(spec_path, out):
    sp = json.load(open(spec_path, encoding="utf-8"))
    if sp.get("art"): return main_art(sp, out)
    bx, by, bw, bh = [v * S for v in sp.get("box", [1150, 55, 740, 360])]
    img = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 그림자 → 판(회색 반투명) → 흰 테두리
    sh = Image.new("L", img.size, 0)
    ImageDraw.Draw(sh).rounded_rectangle((bx + 8 * S, by + 10 * S, bx + bw + 8 * S, by + bh + 10 * S), 30 * S, fill=110)
    img.paste(Image.new("RGBA", img.size, (0, 0, 0, 255)), (0, 0), sh.filter(ImageFilter.GaussianBlur(14 * S)))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((bx, by, bx + bw, by + bh), 30 * S, fill=(128, 128, 128, 225), outline=(255, 255, 255, 255), width=7 * S)
    pad = 26 * S
    mx0, my0, mx1, my1 = bx + pad, by + pad, bx + bw - pad, by + bh - pad
    P = lambda x, y: (mx0 + (mx1 - mx0) * x, my0 + (my1 - my0) * y)
    LW = 5 * S
    WHT = (255, 255, 255, 255)

    def line(a, b, w=LW):
        d.line([P(*a), P(*b)], fill=WHT, width=w)

    def dot(x, y, r=5):
        cx, cy = P(x, y); d.ellipse((cx - r * S, cy - r * S, cx + r * S, cy + r * S), fill=WHT)

    def dotted(a, b, n=7):
        for k in range(n):
            t = k / (n - 1); x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t; dot(x, y, 2.6)
    # 양쪽 칸 (매트 사진과 같은 배치: 세로 3줄 × 가로 2줄, 칸 모서리 점)
    for z0, z1 in ((0.05, 0.31), (0.69, 0.95)):
        xs = [z0 + (z1 - z0) * k / 4 for k in (1, 2, 3)]
        for x in xs:
            for ya, yb in ((0.08, 0.30), (0.40, 0.60), (0.70, 0.92)):
                line((x, ya), (x, yb))
        for y in (0.35, 0.65):
            for k in range(4):
                xa = z0 + (z1 - z0) * k / 4 + 0.012; xb = z0 + (z1 - z0) * (k + 1) / 4 - 0.012
                line((xa, y), (xb, y))
        for x in (z0, z1):
            for y in (0.06, 0.94): dot(x, y)
    # 가운데 (위·아래 세로 선, 좌·우 가로 선, 점선 방사)
    line((0.5, 0.06), (0.5, 0.26)); line((0.5, 0.74), (0.5, 0.94))
    line((0.37, 0.5), (0.43, 0.5)); line((0.57, 0.5), (0.63, 0.5))
    for ang in (30, 60, 120, 150, 210, 240, 300, 330):
        a = math.radians(ang); rx, ry = 0.10, 0.40
        dotted((0.5 + rx * 0.45 * math.cos(a), 0.5 + ry * 0.45 * math.sin(a)), (0.5 + rx * math.cos(a), 0.5 + ry * math.sin(a)), 5)
    # 화살표 (흰 양쪽 화살표)
    for x0, y, x1 in sp.get("arrows", []):
        a, b = P(x0, y), P(x1, y)
        d.line([a, b], fill=(255, 230, 0, 255), width=7 * S)
        for p, sgn in ((a, -1), (b, 1)):
            hx = 18 * S * sgn
            d.polygon([(p[0] + hx, p[1]), (p[0] - hx * 0.2, p[1] - 14 * S), (p[0] - hx * 0.2, p[1] + 14 * S)], fill=(255, 230, 0, 255))
    # 발 (검정, 발가락이 카메라 쪽 = 아래)
    fh = (my1 - my0) * 0.34; fw = fh * 0.46
    for fx, fy, side, op in sp.get("feet", []):
        cx, cy = P(fx, fy)
        lay = Image.new("RGBA", img.size, (0, 0, 0, 0)); dl = ImageDraw.Draw(lay)
        col = (15, 15, 15, int(255 * op))
        k = -1 if side == "L" else 1   # 엄지 쪽 (화면에서 본 왼발/오른발). 발가락이 아래(카메라 쪽)
        # 발바닥: 뒤꿈치(작은 타원) → 바깥쪽은 곧게, 안쪽은 아치로 오목 → 앞발바닥(큰 타원)
        dl.ellipse((cx - fw * 0.30, cy - fh * 0.50, cx + fw * 0.30, cy - fh * 0.12), fill=col)
        dl.ellipse((cx - fw * 0.46, cy - fh * 0.05, cx + fw * 0.46, cy + fh * 0.30), fill=col)
        out_x = cx - k * fw * 0.44; in_x = cx + k * fw * 0.26
        dl.polygon([(cx - k * fw * 0.29, cy - fh * 0.32), (out_x, cy + fh * 0.10), (in_x, cy + fh * 0.05), (cx + k * fw * 0.05, cy - fh * 0.15), (cx + k * fw * 0.18, cy - fh * 0.32)], fill=col)
        toes = [(0.34, 0.44, 0.15), (0.07, 0.49, 0.105), (-0.14, 0.48, 0.095), (-0.31, 0.43, 0.085), (-0.45, 0.35, 0.075)]
        for tx, ty, tr in toes:
            px = cx + k * tx * fw; py = cy + ty * fh; r = tr * fw * 1.25
            dl.ellipse((px - r, py - r, px + r, py + r), fill=col)
        img.alpha_composite(lay)
    # 스틱 위치 (동그란 원: 스틱 색 + 흰 테두리)
    if sp.get("stick"):
        cx, cy = P(*sp["stick"]); r = 20 * S
        d = ImageDraw.Draw(img)
        d.ellipse((cx - r - 5 * S, cy - r - 5 * S, cx + r + 5 * S, cy + r + 5 * S), fill=(255, 255, 255, 255))
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(190, 210, 80, 255))
        d.ellipse((cx - r * 0.45, cy - r * 0.45, cx + r * 0.45, cy + r * 0.45), fill=(90, 70, 55, 255))
    img = img.resize((W, H), Image.LANCZOS)
    img.save(out)
    print(out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
