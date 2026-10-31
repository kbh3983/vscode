"""터틀볼 공기압 원리 그림 — 영상 속 모델 프레임(8:07 바른 자세 / 8:03 뒤로 기댐 / 8:06 앞으로 숙임)으로 그린 설명 이미지"""
import cv2, numpy as np, sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = sys.argv[1]; OUT = sys.argv[2]
NOTEXT = "notext" in sys.argv[3:]   # 2026-10-23 사용자: "공기압이 허리를 받쳐줌" 말고 글씨 삭제 (제목·빨간 상자)
FONT = "/Users/bbong/Library/Fonts/Paperlogy-7Bold.ttf"
FONT_M = "/Users/bbong/Library/Fonts/Paperlogy-6SemiBold.ttf"
X0, Y0, X1, Y1 = 760, 200, 1600, 1080          # 원본 프레임에서 쓰는 영역 (세 프레임 같은 컷이라 그대로 겹침)
TEXT_TOP = 870                                   # 8:06 프레임의 박힌 자막 위쪽 (이 아래는 겹치지 않게 버림)


def cut(t, ylim=None):
    im = cv2.imread(f"{S}/full_{t}.png")[Y0:Y1, X0:X1]
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    # 모델 범위 = 검은 옷·머리(어두운 픽셀) 중 가장 큰 덩어리의 상자 + 여백
    dark = ((hsv[..., 2] < 70) * 255).astype(np.uint8)
    if ylim: dark[ylim - Y0:, :] = 0
    dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(dark)
    k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); x, y, w, h = st[k, :4]
    rect = (max(1, x - 70), max(1, y - 40), min(im.shape[1] - 2, w + 140) , min(im.shape[0] - 2, h + 80))
    rect = (rect[0], rect[1], min(rect[2], im.shape[1] - rect[0] - 1), min(rect[3], im.shape[0] - rect[1] - 1))
    mask = np.zeros(im.shape[:2], np.uint8)
    mask[lab == k] = cv2.GC_FGD
    bg = np.zeros((1, 65)); fg = np.zeros((1, 65))
    cv2.grabCut(im, mask, rect, bg, fg, 6, cv2.GC_INIT_WITH_RECT | cv2.GC_INIT_WITH_MASK)
    m = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
    wall = (hsv[..., 1] < 35) & (hsv[..., 2] > 120)   # 회색 벽·그림자
    m[wall] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    chair = (hsv[..., 0] >= 5) & (hsv[..., 0] <= 50) & (hsv[..., 1] > 70) & (hsv[..., 2] > 90)
    person = m.copy(); person[chair] = 0
    person = cv2.morphologyEx(person, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(person)
    if n > 1:
        k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); person = np.where(lab == k, 255, 0).astype(np.uint8)
    return im, m, person


def cartoon(im):
    sm = im.copy()
    for _ in range(4): sm = cv2.bilateralFilter(sm, 9, 60, 9)
    q = (sm // 24) * 24 + 12                     # 색 단계 줄이기
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    ed = cv2.adaptiveThreshold(cv2.medianBlur(g, 5), 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 4)
    out = q.copy(); out[ed == 0] = (out[ed == 0] * 0.35).astype(np.uint8)
    return out



up_im = cv2.imread(f"{S}/full_487.0.png")[Y0:Y1, X0:X1]
_m = np.zeros(up_im.shape[:2], np.uint8); _b = np.zeros((1, 65)); _f = np.zeros((1, 65))
cv2.grabCut(up_im, _m, (60, 5, up_im.shape[1] - 70, up_im.shape[0] - 6), _b, _f, 6, cv2.GC_INIT_WITH_RECT)
up_full = np.where((_m == 1) | (_m == 3), 255, 0).astype(np.uint8)
hsv = cv2.cvtColor(up_im, cv2.COLOR_BGR2HSV)
up_full[(hsv[..., 1] < 40) & (hsv[..., 2] > 150)] = 0        # 벽·그림자 빼기
up_full = cv2.morphologyEx(up_full, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
up_full = cv2.morphologyEx(up_full, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(up_full)
up_full = np.where(lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
up_full = cv2.morphologyEx(up_full, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))   # 얼굴 밝은 부분 구멍 메우기
H, W = up_im.shape[:2]

chair = (hsv[..., 0] >= 5) & (hsv[..., 0] <= 50) & (hsv[..., 1] > 70) & (hsv[..., 2] > 90)
lime = (hsv[..., 0] >= 28) & (hsv[..., 0] <= 50) & (hsv[..., 1] > 70) & (hsv[..., 2] > 90)
ys, xs = np.nonzero(lime); bx, by = int(np.median(xs)), int(np.median(ys))

person = up_full.copy(); person[chair] = 0
ys, xs = np.nonzero(person); top_y = ys.min()
CUT = by - 100                                    # 상체만 (손·무릎 위 제외)
torso = person.copy(); torso[CUT:, :] = 0
PIV = (bx - 60, by + 20)                          # 엉덩이 쪽 회전 축

PAD_T = 330                                       # 기울어진 머리가 들어갈 위쪽 여유
CW, CH = W, H + PAD_T
canvas = Image.new("RGBA", (CW, CH), (255, 255, 255, 255))
piv = (PIV[0], PIV[1] + PAD_T)

def shift(a):
    out = np.zeros((CH, CW), a.dtype); out[PAD_T:, :] = a; return out

def rot(a, ang):
    M = cv2.getRotationMatrix2D(piv, ang, 1.0)
    return cv2.warpAffine(shift(a), M, (CW, CH), flags=cv2.INTER_LINEAR)

GHOST = (110, 128, 160)
ghosts = {}
for name, ang in (("back", -16), ("fwd", 24)):
    g = rot(torso, ang); ghosts[name] = g
    a = cv2.GaussianBlur((g > 127).astype(np.uint8) * 80, (3, 3), 0)
    lay = Image.new("RGBA", (CW, CH), GHOST + (0,)); lay.putalpha(Image.fromarray(a)); canvas.alpha_composite(lay)
    edge = cv2.dilate(cv2.Canny((g > 127).astype(np.uint8) * 255, 50, 150), np.ones((3, 3), np.uint8))
    # 점선 테두리
    yy, xx = np.nonzero(edge); keep = ((xx + yy) // 14) % 2 == 0
    e2 = np.zeros_like(edge); e2[yy[keep], xx[keep]] = 200
    el = Image.new("RGBA", (CW, CH), GHOST + (0,)); el.putalpha(Image.fromarray(e2)); canvas.alpha_composite(el)

cart = cartoon(up_im)
main = Image.fromarray(cv2.cvtColor(cart, cv2.COLOR_BGR2RGB)).convert("RGBA")
main.putalpha(Image.fromarray(cv2.GaussianBlur(up_full, (3, 3), 0)))
canvas.alpha_composite(main, (0, PAD_T))

d = ImageDraw.Draw(canvas)
f_big = ImageFont.truetype(FONT, 76); f_lab = ImageFont.truetype(FONT, 50); f_s = ImageFont.truetype(FONT, 48)
RED = (232, 40, 40, 255); BLUE = (20, 120, 230, 255)

def arrow(pts, col, w=10, head=30):
    d.line(pts, fill=col, width=w, joint="curve")
    (x1, y1), (x2, y2) = pts[-2], pts[-1]
    a = math.atan2(y2 - y1, x2 - x1)
    tip = (x2 + math.cos(a) * 8, y2 + math.sin(a) * 8)
    l = (x2 - math.cos(a - 0.5) * head, y2 - math.sin(a - 0.5) * head)
    r = (x2 - math.cos(a + 0.5) * head, y2 - math.sin(a + 0.5) * head)
    d.polygon([tip, l, r], fill=col)

def arc(c, r, a0, a1, n=30):
    return [(c[0] + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), c[1] + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]

def top(p):
    ys, xs = np.nonzero(p > 127); i = np.argmin(ys); return int(xs[i]), int(ys[i])
hu = top(shift(torso)); hb = top(ghosts["back"]); hf = top(ghosts["fwd"])
ang = lambda p: math.degrees(math.atan2(p[1] - piv[1], p[0] - piv[0]))
R = math.hypot(hu[0] - piv[0], hu[1] - piv[1]) + 55
arrow(arc(piv, R, ang(hb) - 3, ang(hu) + 5), RED)
arrow(arc(piv, R, ang(hf) + 3, ang(hu) - 5), RED)

def label(x, y, lines, col, f, anchor_right=False):
    w = max(d.textbbox((0, 0), s, font=f)[2] for s in lines); lh = f.size + 8
    if anchor_right: x -= w
    x = min(max(14, x), CW - w - 14)
    d.rounded_rectangle((x - 14, y - 10, x + w + 14, y + lh * len(lines) + 4), 12, fill=(255, 255, 255, 240), outline=col, width=4)
    for i, s in enumerate(lines): d.text((x, y + i * lh), s, font=f, fill=col)

pb = arc(piv, R, ang(hb), ang(hb))[0]; pf = arc(piv, R, ang(hf), ang(hf))[0]
if not NOTEXT: label(pb[0] - 20, pb[1] - 150, ["뒤로 기대도", "→ 앞으로"], RED, f_s)
if not NOTEXT: label(pf[0] + 40, pf[1] - 150, ["앞으로 숙여도", "→ 뒤로"], RED, f_s, anchor_right=True)

base_canvas = canvas.copy()                      # 바탕 (파란 요소 빼고)
# 공기압: 볼이 허리를 앞으로 받쳐 줌 — 화살표·글씨는 따로 그려 둠 (2026-10-23 트랙 분리)
Y = PAD_T
arrows_l = Image.new("RGBA", (CW, CH), (0, 0, 0, 0)); label_l = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
d = ImageDraw.Draw(arrows_l)
for dy in (-34, 0, 34):
    arrow([(bx + 24, by + Y + dy), (bx - 56, by + Y + dy)], BLUE, w=8, head=22)
d = ImageDraw.Draw(label_l)
label(bx + 60, by + Y - 190, ["공기압이", "허리를", "받쳐 줌"], BLUE, f_lab)
canvas.alpha_composite(arrows_l); canvas.alpha_composite(label_l)
d = ImageDraw.Draw(canvas)


if "full" in sys.argv[3:]:
    # 화면 전체 1920x1080. layer=all|base|arrows|label (base만 흰 배경, 나머지는 투명)
    LAYER = "all"; HEAD = None
    for a_ in sys.argv[3:]:
        if a_.startswith("layer="): LAYER = a_[6:]
        if a_.startswith("head="): HEAD = int(a_[5:])     # 맨 위 그림(빨간 화살표) 높이 → 아래 기준으로 키워 헤드룸 맞춤
    top = PAD_T - Y0
    src = {"all": canvas, "base": base_canvas, "arrows": arrows_l, "label": label_l}[LAYER]
    arr = np.array(base_canvas.convert("L")); ys_, xs_ = np.nonzero(arr < 245)
    dx = (1920 - (xs_.max() - xs_.min())) // 2 - xs_.min()
    for a_ in sys.argv[3:]:
        if a_.startswith("dx="): dx = int(a_[3:])
    fr = Image.new("RGBA", (1920, 1080), (255, 255, 255, 255) if LAYER in ("all", "base") else (0, 0, 0, 0))
    lay = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0)); lay.alpha_composite(src.crop((0, top, CW, CH)), (dx, 0))
    if HEAD is not None:
        content_top = ys_.min() - top
        k = (1080 - HEAD) / (1080 - content_top)
        big = lay.resize((round(1920 * k), round(1080 * k)), Image.LANCZOS)
        lay = big.crop((round(960 * k - 960), big.height - 1080, round(960 * k + 960), big.height))
    fr.alpha_composite(lay)
    fd = ImageDraw.Draw(fr)
    f_t = ImageFont.truetype(FONT, 84)
    TITLE = "터틀볼 공기압이 바른 자세로 되돌려 줘요"
    tw = fd.textbbox((0, 0), TITLE, font=f_t)[2]
    if not NOTEXT and LAYER == "all": fd.text(((1920 - tw) // 2, 70), TITLE, font=f_t, fill=(25, 25, 25, 255))
    (fr.convert("RGB") if LAYER in ("all", "base") else fr).save(OUT)
    a = np.array(fr)[..., 3] if LAYER not in ("all", "base") else 255 - np.array(fr.convert("L"))
    ys2, xs2 = np.nonzero(a > 20)
    print(LAYER, "dx", dx, "k", round(k, 3) if HEAD is not None else 1, "bbox", xs2.min(), ys2.min(), xs2.max(), ys2.max())
    sys.exit(0)

# 내용만 남기고 자르기
arr = np.array(canvas.convert("L")); ys, xs = np.nonzero(arr < 245)
canvas = canvas.crop((max(0, xs.min() - 30), max(0, ys.min() - 30), min(CW, xs.max() + 30), min(CH, ys.max() + 10)))

TITLES = ["터틀볼 공기압이", "바른 자세로 되돌려 줘요"]
LH = f_big.size + 14
tw = max(d.textbbox((0, 0), t, font=f_big)[2] for t in TITLES)
card_w = max(canvas.width + 40, tw + 80); TH = 40 + LH * len(TITLES) + 10
card = Image.new("RGBA", (card_w, canvas.height + TH + 20), (255, 255, 255, 255))
cd = ImageDraw.Draw(card)
for i, t in enumerate(TITLES):
    w_ = cd.textbbox((0, 0), t, font=f_big)[2]
    cd.text(((card_w - w_) // 2, 36 + i * LH), t, font=f_big, fill=(25, 25, 25, 255))
card.alpha_composite(canvas, ((card_w - canvas.width) // 2, TH))
cd.rectangle((0, 0, card_w - 1, card.height - 1), outline=RED, width=14)
card.save(OUT)
print("size", card.size, "heads", hu, hb, hf, "ball", bx, by)
