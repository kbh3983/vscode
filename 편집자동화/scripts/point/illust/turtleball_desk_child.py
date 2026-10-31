"""터틀볼 앞뒤 받침 책상 그림 — 아이·손 내림·가슴 볼이 책상 끝에 닿는 구조 (2026-10-23 사용자 수정 요청)
입력: child_img2img.py 결과 (8:07 프레임 사람을 같은 자세의 아이로, 1024, 원래 잘라낸 영역 900x880을 (62,144)에 붙인 것)
가슴 앞 볼은 직접 그림(납작한 면 = 가슴, 둥근 면 = 책상 쪽), 책상 상판 끝면이 볼 둥근 면에 닿게.
그림체는 turtleball_principle.py와 같은 만화 필터, 화면 배율 1.211 (아래 기준)
  python turtleball_desk_child.py <아이 png> <출력 폴더> <8:38.0 프레임 png>
"""
import cv2, numpy as np, sys, math, os
from PIL import Image, ImageDraw

SRC = sys.argv[1]; OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
OX, OY, CW0, CH0 = 62, 144, 900, 880      # 1024 입력 안에서 원래 영역 위치·크기 (원래 프레임 x 700~1600, y 200~1080)
K = 1.211
LINE = (35, 30, 40, 255)


def cartoon(im):
    sm = im.copy()
    for _ in range(4): sm = cv2.bilateralFilter(sm, 9, 60, 9)
    q = (sm // 24) * 24 + 12
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    ed = cv2.adaptiveThreshold(cv2.medianBlur(g, 5), 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 4)
    out = q.copy(); out[ed == 0] = (out[ed == 0] * 0.35).astype(np.uint8)
    return out


im = cv2.imread(SRC)[OY:OY + CH0, OX:OX + CW0].copy()
H, W = im.shape[:2]
mask = (im.min(axis=2) < 232).astype(np.uint8) * 255                 # 흰 배경 아닌 곳
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(mask)
mask = np.where(lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)

# 몸 앞 선: 어깨 아래 가슴 높이에서 가장 앞(왼쪽) 점 — 팔·손 높이 위
ys, xs = np.nonzero(mask); top = ys.min()
dark = (hsv[..., 2] < 70) & (mask > 0)                                # 검은 티셔츠
rows = dark.sum(axis=1)
neck = next(y for y in range(top + 40, H) if rows[y] < 30)            # 머리카락 아래 목 (어두운 곳이 끊기는 줄)
sh_top = next(y for y in range(neck, H) if rows[y] > 40)               # 티셔츠 시작
CY = sh_top + 120                                                     # 가슴 가운데 높이
front = [np.nonzero(dark[y])[0].min() for y in range(CY - 40, CY + 40) if dark[y].any()]
CHEST_X = int(np.median(front))
print("head top", top, "shirt top", sh_top, "chest y", CY, "chest x", CHEST_X)

# 가슴 앞 볼: 실제 영상 8:38.0 프레임의 볼(무릎 위, 손가락에 거의 안 가림)을 잘라 납작한 면이 세로가 되게 돌려 붙임
BALL_SRC = sys.argv[3] if len(sys.argv) > 3 else None                 # 8:38.0 원본 프레임 png
ROT = float(sys.argv[4]) if len(sys.argv) > 4 else 20                  # 볼 회전 (PIL, 시계 반대 +): 납작한 면이 가슴(오른쪽)을 보게
bimg = cv2.imread(BALL_SRC)[700:920, 860:1100]
bh = cv2.cvtColor(bimg, cv2.COLOR_BGR2HSV)
bm = ((bh[..., 0] >= 25) & (bh[..., 0] <= 50) & (bh[..., 1] > 45) & (bh[..., 2] > 90)).astype(np.uint8) * 255
bm = cv2.morphologyEx(bm, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
n_, lab_, st_, _ = cv2.connectedComponentsWithStats(bm); kk = 1 + np.argmax(st_[1:, 4])
bm = np.where(lab_ == kk, 255, 0).astype(np.uint8); bm = cv2.GaussianBlur(cv2.erode(bm, np.ones((3, 3), np.uint8)), (5, 5), 0)
patch = Image.fromarray(cv2.cvtColor(bimg, cv2.COLOR_BGR2RGB)).convert("RGBA"); patch.putalpha(Image.fromarray(bm))
patch = patch.crop(patch.getbbox()).rotate(ROT, resample=Image.BICUBIC, expand=True)
patch = patch.crop(patch.getbbox())
BH = 124; patch = patch.resize((round(patch.width * BH / patch.height), BH), Image.LANCZOS)
flat_x = CHEST_X + 10
ball = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ball.alpha_composite(patch, (flat_x - patch.width, CY - BH // 2))
BD = patch.width
ball_np = np.array(ball)
photo = cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.float32)
a = ball_np[..., 3:4] / 255.0
photo = photo * (1 - a) + ball_np[..., :3] * a
pm = np.maximum(mask, (ball_np[..., 3] > 0).astype(np.uint8) * 255)
car = cartoon(cv2.cvtColor(photo.astype(np.uint8), cv2.COLOR_RGB2BGR))
person = Image.fromarray(cv2.cvtColor(car, cv2.COLOR_BGR2RGB)).convert("RGBA")
person.putalpha(Image.fromarray(cv2.GaussianBlur(pm, (3, 3), 0)))
APEX_X = flat_x - BD                                                  # 볼 가장 앞 점

# 넓은 캔버스, 책상: 상판 끝면이 볼 둥근 면 앞쪽에 닿게 (상판 가운데 높이 = 볼 가운데)
PADL = 560
CW, CH = W + PADL, H
canvas = Image.new("RGBA", (CW, CH), (0, 0, 0, 0)); d = ImageDraw.Draw(canvas)
TH = 36; TOP = CY - TH // 2
x_r = PADL + APEX_X + 6; x_l = x_r - 760
WOOD, WOOD_D, LEG = (236, 222, 196, 255), (205, 186, 152, 255), (170, 170, 176, 255)
for lx in (x_l + 40, x_l + 70, x_r - 70):
    d.rectangle((lx, TOP + TH, lx + 26, CH), fill=LEG, outline=LINE, width=4)
d.rounded_rectangle((x_l, TOP, x_r, TOP + TH), 8, fill=WOOD, outline=LINE, width=5)
d.line((x_l + 8, TOP + TH - 9, x_r - 8, TOP + TH - 9), fill=WOOD_D, width=5)
# 펼친 책 (공부): 파란 표지 + 흰 종이 두 장
bk_r = x_r - 140; bk_l = bk_r - 300; mid = (bk_l + bk_r) // 2
d.rounded_rectangle((bk_l - 6, TOP - 10, bk_r + 6, TOP + 1), 3, fill=(60, 120, 200, 255), outline=LINE, width=3)   # 표지
d.polygon([(bk_l, TOP - 10), (mid, TOP - 34), (mid, TOP - 12)], fill=(252, 252, 250, 255), outline=LINE)          # 왼쪽 장
d.polygon([(mid, TOP - 12), (mid, TOP - 34), (bk_r, TOP - 10)], fill=(244, 244, 240, 255), outline=LINE)          # 오른쪽 장
d.line([(bk_l, TOP - 10), (mid, TOP - 34), (bk_r, TOP - 10)], fill=LINE, width=4)
canvas.alpha_composite(person, (PADL, 0))

# 파란 화살표: 등 뒤 볼 → 앞, 가슴 앞 볼 → 뒤(가슴 쪽)
arrows = Image.new("RGBA", (CW, CH), (0, 0, 0, 0)); da = ImageDraw.Draw(arrows)
BLUE = (20, 120, 230, 255)
def arrow(p0, p1, w=10, head=26):
    da.line([p0, p1], fill=BLUE, width=w)
    t = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
    tip = (p1[0] + math.cos(t) * 8, p1[1] + math.sin(t) * 8)
    l = (p1[0] - math.cos(t - 0.5) * head, p1[1] - math.sin(t - 0.5) * head)
    r = (p1[0] - math.cos(t + 0.5) * head, p1[1] - math.sin(t + 0.5) * head)
    da.polygon([tip, l, r], fill=BLUE)
lime = (hsv[..., 0] >= 28) & (hsv[..., 0] <= 50) & (hsv[..., 1] > 60) & (hsv[..., 2] > 90) & (mask > 0)
by_, bx_ = np.nonzero(lime)
bcy = int(np.median(by_)); bxr = PADL + int(np.percentile(bx_, 95))
for dy in (-30, 0, 30): arrow((bxr + 26, bcy + dy), (bxr - 60, bcy + dy))
for dy in (-22, 22): arrow((PADL + APEX_X + 18, CY + dy), (PADL + flat_x + 26, CY + dy), w=8, head=22)
print("back ball y", bcy, "x", bxr - PADL, "desk top", TOP, "desk edge x", x_r - PADL, "ball apex", APEX_X)

def place(layer, bg):
    al = np.array(canvas)[..., 3]; ys_, xs_ = np.nonzero(al > 20)
    dx = (1920 - (xs_.max() - xs_.min())) // 2 - xs_.min()
    lay = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0)); lay.alpha_composite(layer, (dx, 1080 - CH))
    big = lay.resize((round(1920 * K), round(1080 * K)), Image.LANCZOS)
    lay = big.crop((round(960 * K - 960), big.height - 1080, round(960 * K + 960), big.height))
    fr = Image.new("RGBA", (1920, 1080), bg); fr.alpha_composite(lay); return fr

base = place(canvas, (255, 255, 255, 255)); base.convert("RGB").save(f"{OUT}/child_desk_base.png")
arr = place(arrows, (0, 0, 0, 0)); arr.save(f"{OUT}/child_desk_arrows.png")
pv = base.copy(); pv.alpha_composite(arr); pv.convert("RGB").save(f"{OUT}/child_desk_preview.png")
print("saved")
