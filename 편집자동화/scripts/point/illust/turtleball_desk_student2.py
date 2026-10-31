"""터틀볼 앞뒤 받침 — 필기하는 학생 최종 합성 (2026-10-23 사용자 2차 수정: 평균 책상·의자 높이, 학생 얼굴, 손 올려 필기)
입력: student_guide.py → child_img2img.py(강도 0.6) → head_inpaint.py 결과 (아이·책상·의자 사진, 흰 배경, 1024,
      원래 프레임 x 700~1600·y 200~1080 영역을 (62,144)에 둔 좌표 = 원래 프레임과 같은 배율)
하는 일: AI가 볼 자리에 만든 것 지우기 → 실제 볼(8:38 프레임)을 배와 책상 끝 사이에 → 책상 끝을 볼 둥근 면에 맞춤 →
         팔을 볼 위로 → 같은 만화 필터 → 책상을 왼쪽으로 늘리고 다리 → 화면 배치(배율 1.211) + 파란 화살표 따로
  python turtleball_desk_student2.py <학생 png> <8:38.0 프레임 png> <출력 폴더> [등받이 되돌릴 원본 png]
"""
import cv2, numpy as np, sys, math, os
from PIL import Image, ImageDraw

SRC, BALL_SRC, OUT = sys.argv[1], sys.argv[2], sys.argv[3]; os.makedirs(OUT, exist_ok=True)
K = 1.211; LINE = (35, 30, 40, 255)


def cartoon(im):
    sm = im.copy()
    for _ in range(4): sm = cv2.bilateralFilter(sm, 9, 60, 9)
    q = (sm // 24) * 24 + 12
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    ed = cv2.adaptiveThreshold(cv2.medianBlur(g, 5), 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 4)
    out = q.copy(); out[ed == 0] = (out[ed == 0] * 0.35).astype(np.uint8)
    return out


im = cv2.imread(SRC); H, W = im.shape[:2]
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
fg = (im.min(axis=2) < 232).astype(np.uint8) * 255
fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
fg = np.isin(lab, [i for i in range(1, n) if st[i, 4] > 3000]).astype(np.uint8) * 255

dark = (hsv[..., 2] < 70) & (fg > 0)
skin = (hsv[..., 0] < 22) & (hsv[..., 1] > 35) & (hsv[..., 2] > 110) & (fg > 0)
wood = (hsv[..., 0] >= 8) & (hsv[..., 0] <= 24) & (hsv[..., 1] > 70) & (hsv[..., 2] > 120) & (fg > 0)
# 책상 상판: 왼쪽 끝(x<200)의 나무색 줄
rows = [y for y in range(400, H) if wood[y, 5:200].mean() > 0.6]
D_TOP, D_BOT = min(rows), max(rows)
cy = (D_TOP + D_BOT) // 2
# 책상 끝: 상판 아래쪽 줄에서 왼쪽부터 나무색이 끊기는 곳 (팔뚝 살색이 나무색 범위에 걸려 max로 찾으면 틀림)
_r = wood[D_BOT - 4]; d_end = 5
while d_end < W - 1 and (_r[d_end + 1] or _r[d_end + 2] or _r[d_end + 3]): d_end += 1
belly_x = int(np.median([np.nonzero(dark[y, 300:])[0].min() + 300 for y in range(cy - 12, cy + 12)]))
print("desk top/bottom", D_TOP, D_BOT, "desk end", d_end, "belly x", belly_x)

# 실제 볼
b = cv2.imread(BALL_SRC)[700:920, 860:1100]; bh = cv2.cvtColor(b, cv2.COLOR_BGR2HSV)
bm = ((bh[..., 0] >= 25) & (bh[..., 0] <= 50) & (bh[..., 1] > 45) & (bh[..., 2] > 90)).astype(np.uint8) * 255
bm = cv2.morphologyEx(bm, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
n2, lab2, st2, _ = cv2.connectedComponentsWithStats(bm); k = 1 + np.argmax(st2[1:, 4])
bm = cv2.GaussianBlur(cv2.erode(np.where(lab2 == k, 255, 0).astype(np.uint8), np.ones((3, 3), np.uint8)), (5, 5), 0)
patch = Image.fromarray(cv2.cvtColor(b, cv2.COLOR_BGR2RGB)).convert("RGBA"); patch.putalpha(Image.fromarray(bm))
patch = patch.crop(patch.getbbox()).rotate(120, resample=Image.BICUBIC, expand=True); patch = patch.crop(patch.getbbox())
BH = 132; patch = patch.resize((round(patch.width * BH / patch.height), BH), Image.LANCZOS)
flat_x = belly_x + 8; apex = flat_x - patch.width
BCY = D_BOT + 10                                                    # 볼 가운데: 상판 끝면 바로 아래 → 끝면이 볼 위쪽에 닿고, 팔뚝 아래로 볼이 보임
by0 = BCY - BH // 2

photo = cv2.cvtColor(im, cv2.COLOR_BGR2RGB).copy()
# 등받이·등 뒤 볼: AI가 하나로 합쳐 버리면 가이드 원본(같은 좌표)의 그 부분으로 되돌림
if len(sys.argv) > 4:
    g = cv2.cvtColor(cv2.imread(sys.argv[4]), cv2.COLOR_BGR2RGB)
    X0b, Y0b, X1b, Y1b = 712, 680, 800, 930
    m_ = np.zeros((H, W), np.float32); m_[Y0b:Y1b, X0b:X1b] = 1; m_ = cv2.GaussianBlur(m_, (21, 21), 0)[..., None]
    photo = (photo * (1 - m_) + g * m_).astype(np.uint8)
    gfg = (g.min(axis=2) < 232); fg[Y0b:Y1b, X0b:X1b] = np.where(gfg[Y0b:Y1b, X0b:X1b], 255, fg[Y0b:Y1b, X0b:X1b])
    hsv = cv2.cvtColor(cv2.cvtColor(photo, cv2.COLOR_RGB2BGR), cv2.COLOR_BGR2HSV)
# 1) 볼 자리 정리: 책상 끝~배 사이, 책상 아래쪽의 옷·살·나무가 아닌 것(AI가 만든 종이 등) → 흰 배경
clean = np.zeros((H, W), bool)
x0c, x1c = min(apex, d_end) - 30, belly_x
clean[D_TOP - 10:by0 + BH + 60, x0c:x1c] = True
junk = clean & ~dark & ~skin & ~wood & (fg > 0)
fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))   # 외곽선 메우기는 지우기 전에 (뒤에 하면 지운 자리가 흰 얼룩으로 남음)
photo[junk] = 255; fg[junk] = 0
# 2) 책상 끝을 볼 둥근 면에 맞춤: 넘치면 자르고, 모자라면 늘림
if d_end > apex + 4:
    cut = np.zeros((H, W), bool); cut[D_TOP - 2:D_BOT + 3, apex + 4:d_end + 3] = True
    cut &= wood | ~(dark | skin)
    photo[cut] = 255; fg[cut] = 0
elif d_end < apex + 4:
    for x in range(d_end + 1, apex + 5):
        photo[D_TOP:D_BOT + 1, x] = photo[D_TOP:D_BOT + 1, d_end - 2]; fg[D_TOP:D_BOT + 1, x] = 255
# 3) 볼 붙이기 + 팔(살색)은 다시 위로
# 10-23: 볼은 그림으로 그려 필터 전 사진에 넣고, 그 위에 원본 사진의 팔을 얹은 뒤 한 번에 필터
#   (오린 볼은 원본 손가락 자국이 섞여 뭉개짐 / 필터 뒤 덧칠은 팔뚝 아랫선이 울퉁불퉁)
# 배 앞 볼 그리기 (반구, 둥근 면 = 책상 쪽): 4배로 그려 줄여 매끄럽게
BD = flat_x - apex; S4 = 4
bw, bhh = (BD + 12) * S4, (BH + 12) * S4
bl = Image.new("RGBA", (bw, bhh), (0, 0, 0, 0)); db = ImageDraw.Draw(bl)
cx, cy4, rx, ry = (BD + 6) * S4, (BH // 2 + 6) * S4, BD * S4, (BH // 2) * S4
LIME, LIME_D, LIME_L, RIB = (200, 216, 122, 255), (180, 198, 102, 255), (222, 232, 160, 255), (186, 202, 108, 255)   # 필터 전 사진에 넣으므로 은은하게
db.pieslice((cx - rx, cy4 - ry, cx + rx, cy4 + ry), 90, 270, fill=LIME)
db.pieslice((cx - rx * 0.92, cy4 - ry * 0.25, cx + rx * 0.92, cy4 + ry * 0.98), 90, 200, fill=LIME_D)   # 아래쪽 그늘
for t in (0.18, 0.38, 0.58, 0.76, 0.9):                                 # 결: 축(가로)을 도는 고리가 옆에서 보이는 모양
    r = ry * math.sqrt(1 - t * t); x = cx - rx * t; wx = max(6, rx * 0.10 * (1 - t))
    db.arc((x - wx, cy4 - r, x + wx, cy4 + r), 90, 270, fill=RIB, width=3 * S4)
db.arc((cx - rx * 0.8, cy4 - ry * 0.85, cx + rx * 0.5, cy4 + ry * 0.2), 200, 250, fill=LIME_L, width=5 * S4)  # 빛
bl = bl.resize((BD + 12, BH + 12), Image.LANCZOS)
# 단색 볼 (필터 전) — 같은 모양
blf = Image.new("RGBA", (bw, bhh), (0, 0, 0, 0)); ImageDraw.Draw(blf).pieslice((cx - rx, cy4 - ry, cx + rx, cy4 + ry), 90, 270, fill=LIME)
blf = blf.resize((BD + 12, BH + 12), Image.LANCZOS)
# 무늬 레이어 (필터 뒤, 팔에 안 가린 볼에만): 그늘·결·빛 — 바탕색은 빼고
blp = Image.new("RGBA", (bw, bhh), (0, 0, 0, 0)); dp = ImageDraw.Draw(blp)
dp.pieslice((cx - rx * 0.92, cy4 - ry * 0.25, cx + rx * 0.92, cy4 + ry * 0.98), 90, 200, fill=(170, 188, 94, 255))
for t in (0.18, 0.38, 0.58, 0.76, 0.9):
    r = ry * math.sqrt(1 - t * t); x = cx - rx * t; wx = max(6, rx * 0.10 * (1 - t))
    dp.arc((x - wx, cy4 - r, x + wx, cy4 + r), 90, 270, fill=(150, 168, 80, 255), width=2 * S4)
dp.arc((cx - rx * 0.8, cy4 - ry * 0.85, cx + rx * 0.5, cy4 + ry * 0.2), 200, 250, fill=(226, 236, 170, 255), width=5 * S4)
blp = blp.resize((BD + 12, BH + 12), Image.LANCZOS)
pp = Image.fromarray(photo).convert("RGBA"); pp.alpha_composite(blf, (apex - 6, by0 - 6))
ball_a = np.zeros((H, W), np.uint8); ball_a[by0 - 6:by0 - 6 + blf.height, apex - 6:apex - 6 + blf.width] = np.array(blf)[..., 3]
pa = np.array(pp)[..., :3]
# 팔: 살색(얼굴·책상 상판·등받이 영역 제외) 가장 큰 덩어리 → 세로줄 채우기 → 그늘진 아랫면까지 아래로 늘림
arm = skin.copy(); arm[:D_TOP - 200] = False; arm[D_TOP - 3:D_BOT + 3, :d_end + 3] = False; arm[:, 705:] = False
n3, lab3, st3, _ = cv2.connectedComponentsWithStats(arm.astype(np.uint8))
if n3 > 1: arm = lab3 == 1 + np.argmax(st3[1:, 4])
arm = arm.astype(np.uint8)
lum = photo.min(axis=2)
for x in np.nonzero(arm.any(axis=0))[0]:
    yy = np.nonzero(arm[:, x])[0]; y0, y1 = yy.min(), yy.max()
    while y1 + 1 < H and y1 - yy.max() < 14 and 60 < lum[y1 + 1, x] < 225: y1 += 1     # 그늘진 팔뚝 아랫면 (흰 배경·검은 옷 전까지)
    arm[y0:y1 + 1, x] = 1
arm = cv2.morphologyEx(arm, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)) > 0
# 10-23: 팔뚝 아랫선을 곧은 직선으로 (휘어진 틈으로 볼이 튀어나와 팔과 합쳐 보임)
#   손목~팔꿈치 구간 아래 끝 점들에 직선을 맞추고, 직선까지 팔을 채움(바로 위 팔 색을 아래로), 볼은 직선 아래에만
acols = np.nonzero(arm.any(axis=0))[0]
fx0, fx1 = int(acols.min() + 40), int(min(acols.max() - 30, 700))          # 손 끝·위팔 제외한 팔뚝
fxs = np.arange(fx0, fx1); fbot = np.array([np.nonzero(arm[:, x])[0].max() for x in fxs])
k_, b_ = np.polyfit(fxs, fbot, 1)
LINE_Y = lambda x: k_ * x + b_
print("forearm line x", fx0, fx1, "y", round(LINE_Y(fx0)), round(LINE_Y(fx1)))
for x in range(fx0 - 30, fx1 + 1):
    col = np.nonzero(arm[:, x])[0]
    if len(col) == 0: continue
    yb, yl = col.max(), int(round(LINE_Y(x)))
    if yl > yb:                                                            # 직선까지 채움 (아랫면 그늘 살짝)
        src = photo[max(col.min(), yb - 4), x].astype(np.float32) * 0.92
        photo[yb + 1:yl + 1, x] = src.astype(np.uint8); arm[yb + 1:yl + 1, x] = True
    elif yl < yb - 2 and x >= fx0:                                          # 직선 아래로 튀어나온 곳은 깎음
        arm[yl + 1:yb + 1, x] = False
yy_, xx_ = np.mgrid[0:H, 0:W]
above = (xx_ >= fx0 - 30) & (xx_ <= fx1 + 40) & (yy_ <= LINE_Y(xx_) + 1)
ball_a[above] = 0
pa = photo.copy(); bm_ = (ball_a > 0)[..., None]
blf_full = np.zeros((H, W, 4), np.uint8); blf_full[by0 - 6:by0 - 6 + blf.height, apex - 6:apex - 6 + blf.width] = np.array(blf)
al_ = (blf_full[..., 3:4] / 255.0) * bm_
pa = (pa * (1 - al_) + blf_full[..., :3] * al_).astype(np.uint8)
pa[arm] = photo[arm]
# 책상 끝·팔뚝 아랫선 사이에 남은 밝은 잔여물(AI가 그린 종이 가장자리) → 책상 높이는 책상 색, 그 위는 팔 색
for x in range(max(0, d_end - 40), apex + 12):
    for y in range(int(LINE_Y(x)) - 4, D_BOT + 4):
        if fg[y, x] and pa[y, x].min() > 205 and ball_a[y, x] == 0:
            pa[y, x] = photo[cy, max(5, min(x, d_end - 3))] if y >= D_TOP else photo[int(LINE_Y(x)) - 6, x]
fg = np.maximum(fg, (ball_a > 20).astype(np.uint8) * 255)

car = cv2.cvtColor(cartoon(cv2.cvtColor(pa, cv2.COLOR_RGB2BGR)), cv2.COLOR_BGR2RGB)
art = Image.fromarray(car).convert("RGBA"); art.putalpha(Image.fromarray(cv2.GaussianBlur(fg, (3, 3), 0)))

# 4) 책상 왼쪽으로 늘리고 다리
PADL = 260
CW, CH = W + PADL, H
canvas = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
ca = np.array(art)
col = ca[D_TOP:D_BOT + 1, 4:5]                                        # 상판 왼쪽 끝 한 줄을 반복
ext = np.repeat(col, PADL + 4, axis=1)
canvas_np = np.array(canvas); canvas_np[D_TOP:D_BOT + 1, :PADL + 4] = ext; canvas = Image.fromarray(canvas_np)
d = ImageDraw.Draw(canvas)
LEG = (150, 150, 158, 255)
for lx in (40, 72):
    d.rectangle((lx, D_BOT + 1, lx + 26, CH), fill=LEG, outline=LINE, width=4)
canvas.alpha_composite(art, (PADL, 0))
# 볼 무늬: 팔에 안 가린 볼 부분에만 (볼 안쪽으로 3px 들여서 필터 외곽선은 남김)
vis = (ball_a > 200) & ~cv2.dilate(arm.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool)
vis = cv2.erode(vis.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
pat = Image.new("RGBA", (W, H), (0, 0, 0, 0)); pat.alpha_composite(blp, (apex - 6, by0 - 6))
pn = np.array(pat); pn[~vis, 3] = 0
canvas.alpha_composite(Image.fromarray(pn), (PADL, 0))

# 파란 화살표: 등 뒤 볼 → 앞, 배 앞 볼 → 뒤
arrows = Image.new("RGBA", (CW, CH), (0, 0, 0, 0)); da = ImageDraw.Draw(arrows); BLUE = (20, 120, 230, 255)
def arrow(p0, p1, w=10, head=26):
    da.line([p0, p1], fill=BLUE, width=w)
    t = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
    tip = (p1[0] + math.cos(t) * 8, p1[1] + math.sin(t) * 8)
    da.polygon([tip, (p1[0] - math.cos(t - 0.5) * head, p1[1] - math.sin(t - 0.5) * head),
                (p1[0] - math.cos(t + 0.5) * head, p1[1] - math.sin(t + 0.5) * head)], fill=BLUE)
lime = (hsv[..., 0] >= 28) & (hsv[..., 0] <= 50) & (hsv[..., 1] > 60) & (hsv[..., 2] > 90) & (fg > 0)
lime[:D_BOT + 40, :] = False                                          # 등 뒤 볼만 (아래쪽)
ly, lx_ = np.nonzero(lime); bcy = int(np.median(ly)); bxr = PADL + int(np.percentile(lx_, 95))
for dy in (-30, 0, 30): arrow((bxr + 26, bcy + dy), (bxr - 60, bcy + dy))
arrow((PADL + apex + 14, BCY + 14), (PADL + flat_x + 26, BCY + 14), w=8, head=22)
print("back ball", bcy, bxr - PADL, "front ball apex", apex, "flat", flat_x)

def place(layer, bg):
    al = np.array(canvas)[..., 3]; ys_, xs_ = np.nonzero(al > 20)
    dx = (1920 - (xs_.max() - xs_.min())) // 2 - xs_.min()
    lay = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0)); lay.alpha_composite(layer, (dx, 1080 - CH))      # 1024 그림 아래 끝 = 화면 아래 (원래 프레임과 같은 높이)
    big = lay.resize((round(1920 * K), round(1080 * K)), Image.LANCZOS)
    lay = big.crop((round(960 * K - 960), big.height - 1080, round(960 * K + 960), big.height))
    fr = Image.new("RGBA", (1920, 1080), bg); fr.alpha_composite(lay); return fr

base = place(canvas, (255, 255, 255, 255)); base.convert("RGB").save(f"{OUT}/student_base.png")
arr = place(arrows, (0, 0, 0, 0)); arr.save(f"{OUT}/student_arrows.png")
pv = base.copy(); pv.alpha_composite(arr); pv.convert("RGB").save(f"{OUT}/student_preview.png")
print("saved")
