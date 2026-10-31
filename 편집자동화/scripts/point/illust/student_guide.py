"""필기하는 학생 그림용 AI 입력(가이드) 만들기 — 2026-10-23
손을 무릎에 둔 아이 그림(child_img2img 결과, 8:07 프레임 기반)에서 팔뚝·손을 지우고,
팔꿈치에서 앞으로 뻗어 책상 위 공책에 연필을 대는 팔, 평균 높이 책상(다리 포함), 배와 책상 끝 사이 실제 볼을 대략 그려 넣음.
이 가이드를 child_img2img.py(강도 ~0.5)로 자연스럽게 다듬은 뒤 turtleball_desk_student.py로 그림체를 씌움.
  python student_guide.py <아이 1024 png> <8:38.0 프레임 png> <출력 png>
좌표는 1024 기준 (child_s55_2: 어깨 ~(690,630), 팔꿈치 ~(680,760), 허벅지 윗면 ~800, 좌판 ~880, 1cm ≈ 7.6px)
"""
import cv2, numpy as np, sys
from PIL import Image, ImageDraw

SRC, BALL_SRC, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
DESK_TOP, DESK_TH = 715, 30          # 좌판 위 약 22cm (평균 책상 70cm·의자 42cm 차이 28cm에서 팔꿈치 쪽으로 조금 낮춤)
ELBOW = (684, 700); WRIST = (505, 694); HAND = (478, 690)
SKIN = (222, 178, 150); SHIRT = (28, 28, 30)

im = cv2.imread(SRC); hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
H, W = im.shape[:2]
# 1) 원래 팔뚝·손 지우기 (소매 아래 살색, 얼굴 제외)
skin = ((hsv[..., 0] < 25) & (hsv[..., 1] > 35) & (hsv[..., 2] > 80)).astype(np.uint8)
skin[:690, :] = 0; skin[:, 720:] = 0
skin = cv2.dilate(skin, np.ones((9, 9), np.uint8))
out = im.copy()
ys, xs = np.nonzero(skin)
for y, x in zip(ys, xs):
    inside = x > 548 or y > 785                  # 몸통 또는 허벅지 위 → 검은 옷, 나머지는 흰 배경
    out[y, x] = SHIRT[::-1] if inside else (255, 255, 255)
pil = Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB)); d = ImageDraw.Draw(pil)

# 2) 책상 (상판·다리) + 공책
apex_x = None
WOOD, WOOD_D, LEGC = (196, 160, 118), (160, 126, 90), (150, 150, 155)
# 볼 위치 먼저 계산: 배 앞 선 (책상 끝면 높이의 검은 옷 가장 앞)
dark = (cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2HSV)[..., 2] < 70)
cy = DESK_TOP + DESK_TH // 2
belly_x = int(np.median([np.nonzero(dark[y, 300:])[0].min() + 300 for y in range(cy - 15, cy + 15)]))
# 실제 볼 (8:38 프레임) — 120° 돌려 납작한 면이 배 쪽
b = cv2.imread(BALL_SRC)[700:920, 860:1100]; bh = cv2.cvtColor(b, cv2.COLOR_BGR2HSV)
bm = ((bh[..., 0] >= 25) & (bh[..., 0] <= 50) & (bh[..., 1] > 45) & (bh[..., 2] > 90)).astype(np.uint8) * 255
bm = cv2.morphologyEx(bm, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(bm); k = 1 + np.argmax(st[1:, 4])
bm = cv2.GaussianBlur(cv2.erode(np.where(lab == k, 255, 0).astype(np.uint8), np.ones((3, 3), np.uint8)), (5, 5), 0)
patch = Image.fromarray(cv2.cvtColor(b, cv2.COLOR_BGR2RGB)).convert("RGBA"); patch.putalpha(Image.fromarray(bm))
patch = patch.crop(patch.getbbox()).rotate(120, resample=Image.BICUBIC, expand=True); patch = patch.crop(patch.getbbox())
BH = 118; patch = patch.resize((round(patch.width * BH / patch.height), BH), Image.LANCZOS)
apex_x = belly_x + 8 - patch.width
desk_r = apex_x + 6
d.rectangle((40, DESK_TOP + DESK_TH, 66, H), fill=LEGC)          # 앞다리는 정강이와 겹쳐 AI가 헷갈림 → 가이드에선 뺌
d.rectangle((0, DESK_TOP, desk_r, DESK_TOP + DESK_TH), fill=WOOD); d.line((0, DESK_TOP + DESK_TH - 6, desk_r, DESK_TOP + DESK_TH - 6), fill=WOOD_D, width=5)
d.polygon([(HAND[0] - 190, DESK_TOP - 6), (HAND[0] + 80, DESK_TOP - 6), (HAND[0] + 84, DESK_TOP), (HAND[0] - 194, DESK_TOP)], fill=(250, 250, 246))
pil = pil.convert("RGBA"); pil.alpha_composite(patch, (apex_x, cy - BH // 2)); d = ImageDraw.Draw(pil)

# 3) 새 팔: 소매 끝 → 팔꿈치(위팔), 팔꿈치 → 손목(팔뚝, 상판 위), 손 + 연필
d.line([(690, 660), ELBOW], fill=SKIN, width=48)
d.line([ELBOW, WRIST], fill=SKIN, width=44); d.ellipse((ELBOW[0] - 24, ELBOW[1] - 22, ELBOW[0] + 24, ELBOW[1] + 22), fill=SKIN)
d.ellipse((HAND[0] - 32, HAND[1] - 20, HAND[0] + 30, HAND[1] + 20), fill=SKIN)
d.line([(HAND[0] - 22, DESK_TOP - 8), (HAND[0] + 18, HAND[1] - 64)], fill=(240, 190, 50), width=9)
pil.convert("RGB").save(OUT)
print("belly x", belly_x, "ball apex", apex_x, "desk right", desk_r, "desk top", DESK_TOP)
