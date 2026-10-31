"""터틀볼 앞뒤로 받치고 책상에 앉은 그림 — 8:28.5 최박사 피드백 (2026-10-23)
영상 속 모델 프레임(8:29.0, 배 앞 볼을 팔로 감싸고 등 뒤 볼에 기댄 자세)을 turtleball_principle.py와 같은 그림체로,
앞에 책상·노트북을 그려 넣음. 바탕(흰 배경)과 파란 화살표(투명)를 따로 저장.
  python turtleball_desk.py <프레임 png> <출력 폴더>
"""
import cv2, numpy as np, sys, math, os
from PIL import Image, ImageDraw

SRC = sys.argv[1]; OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
X0, Y0, X1, Y1 = 680, 200, 1600, 1080           # 앞 그림보다 왼쪽으로 넓게 (무릎 안 잘리게) — 배율은 같음
K = 1.211                                        # 앞 그림과 같은 배율 (아래 기준으로 키움)
LINE = (35, 30, 40, 255)


def cartoon(im):
    sm = im.copy()
    for _ in range(4): sm = cv2.bilateralFilter(sm, 9, 60, 9)
    q = (sm // 24) * 24 + 12
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    ed = cv2.adaptiveThreshold(cv2.medianBlur(g, 5), 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 4)
    out = q.copy(); out[ed == 0] = (out[ed == 0] * 0.35).astype(np.uint8)
    return out


im = cv2.imread(SRC)[Y0:Y1, X0:X1]
H, W = im.shape[:2]
m = np.zeros((H, W), np.uint8); b = np.zeros((1, 65)); f = np.zeros((1, 65))
cv2.grabCut(im, m, (12, 5, W - 22, H - 6), b, f, 6, cv2.GC_INIT_WITH_RECT)
full = np.where((m == 1) | (m == 3), 255, 0).astype(np.uint8)
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
full[(hsv[..., 1] < 40) & (hsv[..., 2] > 150)] = 0          # 벽·그림자
full = cv2.morphologyEx(full, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
full = cv2.morphologyEx(full, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(full)
full = np.where(lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
full = cv2.morphologyEx(full, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))

person = Image.fromarray(cv2.cvtColor(cartoon(im), cv2.COLOR_BGR2RGB)).convert("RGBA")
person.putalpha(Image.fromarray(cv2.GaussianBlur(full, (3, 3), 0)))

# 손·팔 아래 끝 → 책상 높이, 배 앞 볼 → 책상 앞 끝
lime = (hsv[..., 0] >= 28) & (hsv[..., 0] <= 50) & (hsv[..., 1] > 70) & (hsv[..., 2] > 90) & (full > 0)
n2, lab2, st2, cen2 = cv2.connectedComponentsWithStats(lime.astype(np.uint8))
balls = sorted([(st2[i, cv2.CC_STAT_AREA], i) for i in range(1, n2)], reverse=True)[:2]
bb = [(st2[i, 0], st2[i, 1], st2[i, 0] + st2[i, 2], st2[i, 1] + st2[i, 3]) for _, i in balls]
front = min(bb, key=lambda r: r[0]); back = max(bb, key=lambda r: r[0])
skin = (hsv[..., 0] < 25) & (hsv[..., 1] > 40) & (hsv[..., 2] > 90) & (full > 0)
ys, xs = np.nonzero(skin[:, :front[2] + 120]); ys2 = ys[ys > front[1]]
hand_bottom = int(np.percentile(ys2, 99)) if len(ys2) else front[3] + 100
DESK_Y = hand_bottom - 6                          # 손이 상판 위에 얹힌 느낌으로 살짝 겹침
EDGE_X = front[0] + 40                            # 상판 앞 끝 (배 쪽) — 볼 아래까지
print("front ball", front, "back ball", back, "hand bottom", hand_bottom, "desk y", DESK_Y)

# 넓은 캔버스 (책상이 왼쪽으로 뻗음)
PADL = 420
CW, CH = W + PADL, H
canvas = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
d = ImageDraw.Draw(canvas)
TOP, TH = DESK_Y, 34
x_r = PADL + EDGE_X; x_l = x_r - 760
WOOD, WOOD_D, LEG = (236, 222, 196, 255), (205, 186, 152, 255), (170, 170, 176, 255)
# 다리 (먼 쪽 두 개 + 가까운 쪽), 상판, 노트북
for lx in (x_l + 40, x_l + 70, x_r - 190):
    d.rectangle((lx, TOP + TH, lx + 26, CH), fill=LEG, outline=LINE, width=4)
d.rounded_rectangle((x_l, TOP, x_r, TOP + TH), 8, fill=WOOD, outline=LINE, width=5)
d.line((x_l + 8, TOP + TH - 9, x_r - 8, TOP + TH - 9), fill=WOOD_D, width=5)
lap_r = x_r - 150; lap_l = lap_r - 300
d.rounded_rectangle((lap_l, TOP - 18, lap_r, TOP), 6, fill=(190, 194, 202, 255), outline=LINE, width=4)       # 본체
scr = [(lap_l + 6, TOP - 18), (lap_l - 70, TOP - 250), (lap_l - 52, TOP - 258), (lap_l + 26, TOP - 22)]          # 화면 (기울어짐)
d.polygon(scr, fill=(150, 156, 168, 255), outline=LINE); d.line(scr + [scr[0]], fill=LINE, width=4)

canvas.alpha_composite(person, (PADL, 0))

# 파란 화살표 (따로): 등 뒤 볼 → 앞으로, 배 앞 볼 → 뒤로
arrows = Image.new("RGBA", (CW, CH), (0, 0, 0, 0)); da = ImageDraw.Draw(arrows)
BLUE = (20, 120, 230, 255)
def arrow(p0, p1, w=10, head=26):
    da.line([p0, p1], fill=BLUE, width=w)
    a = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
    tip = (p1[0] + math.cos(a) * 8, p1[1] + math.sin(a) * 8)
    l = (p1[0] - math.cos(a - 0.5) * head, p1[1] - math.sin(a - 0.5) * head)
    r = (p1[0] - math.cos(a + 0.5) * head, p1[1] - math.sin(a + 0.5) * head)
    da.polygon([tip, l, r], fill=BLUE)
bcy = (back[1] + back[3]) // 2; bx = PADL + back[2]
for dy in (-30, 0, 30): arrow((bx + 26, bcy + dy), (bx - 60, bcy + dy))
fcy = (front[1] + front[3]) // 2; fx = PADL + front[0]
fx2 = PADL + front[2]
for dy in (-24, 0, 24): arrow((fx - 6, fcy + dy), (fx2 + 34, fcy + dy))

# 화면 1920x1080: 사람+책상 덩어리 가운데, 아래 기준 K배
def place(layer, bg):
    a = np.array(canvas)[..., 3]; ys_, xs_ = np.nonzero(a > 20)
    dx = (1920 - (xs_.max() - xs_.min())) // 2 - xs_.min()
    lay = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0)); lay.alpha_composite(layer, (dx, 1080 - CH))
    big = lay.resize((round(1920 * K), round(1080 * K)), Image.LANCZOS)
    lay = big.crop((round(960 * K - 960), big.height - 1080, round(960 * K + 960), big.height))
    fr = Image.new("RGBA", (1920, 1080), bg); fr.alpha_composite(lay); return fr, dx

base, dx = place(canvas, (255, 255, 255, 255)); base.convert("RGB").save(f"{OUT}/desk_base.png")
arr, _ = place(arrows, (0, 0, 0, 0)); arr.save(f"{OUT}/desk_arrows.png")
prev = base.copy(); prev.alpha_composite(arr); prev.convert("RGB").save(f"{OUT}/desk_preview.png")
print("dx", dx, "saved", OUT)
