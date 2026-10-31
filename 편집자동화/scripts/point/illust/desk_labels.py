"""책상 그림 글씨 레이어 — 앞 그림 "공기압이 허리를 받쳐 줌"과 같은 디자인 (2026-10-23)
흰 바탕(240)·파란 테두리 4px·둥근 모서리 12·파란 Paperlogy 7Bold, 앞 그림 50px × 배율 1.211 = 60px
화살표 근처 후보 위치 중 그림(바탕의 흰색 아닌 곳)과 가장 덜 겹치는 곳에 놓음
  python desk_labels.py <바탕 png> <화살표 png> <출력 png>
"""
import sys, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

BASE, ARR, OUT = sys.argv[1:4]
FONT = ImageFont.truetype("/Users/bbong/Library/Fonts/Paperlogy-7Bold.ttf", 60)
BLUE = (20, 120, 230, 255)
base = np.array(Image.open(BASE).convert("L")); arr = np.array(Image.open(ARR))[..., 3]
busy = base < 235; busy[:185, :965] = True                             # 그림 + V5 제목 바·이름표 자리
n, lab, st, _ = cv2.connectedComponentsWithStats((arr > 0).astype(np.uint8))
groups = sorted([tuple(st[i, :4]) for i in range(1, n) if st[i, 4] > 200], key=lambda r: r[0])
front = groups[0]; backs = [g for g in groups if g[0] > front[0] + 150]
bx0 = min(g[0] for g in backs); bx1 = max(g[0] + g[2] for g in backs)
by0 = min(g[1] for g in backs); by1 = max(g[1] + g[3] for g in backs)
print("front arrow", front, "back arrows", bx0, by0, bx1, by1)

def size(lines):
    w = max(FONT.getbbox(s)[2] for s in lines); lh = FONT.size + 10
    return w + 28, lh * len(lines) + 14

YMIN = 440                                                          # 10-23: 사용자가 글씨 클립 위쪽 40%(y 432)를 잘라 둠
def best(lines, cands, ymin=YMIN):
    w, h = size(lines); scored = []
    for (x, y) in cands:
        x, y = int(min(max(20, x), 1900 - w)), int(min(max(ymin, y), 1060 - h))
        scored.append((busy[y:y + h, x:x + w].mean() + (arr[y:y + h, x:x + w] > 0).mean() * 2, x, y))
    scored.sort(); return scored[0]

out = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0)); d = ImageDraw.Draw(out)
def draw(lines, x, y):
    w, h = size(lines); lh = FONT.size + 10
    d.rounded_rectangle((x, y, x + w, y + h), 12, fill=(255, 255, 255, 240), outline=BLUE, width=4)
    for i, s in enumerate(lines): d.text((x + 14, y + 6 + i * lh), s, font=FONT, fill=BLUE)
    busy[y:y + h, x:x + w] = True

# 등 뒤: 화살표 꼬리 쪽(오른쪽) → 위쪽
L1 = ["터틀볼이", "허리를 받쳐", "중심 잡아 줌"]   # 10-23 사용자: "몸을 받쳐줘서 중심이 잡힌다는 느낌"
w1, h1 = size(L1); cyb = (by0 + by1) // 2
s1 = best(L1, [(bx1 + 14, cyb - h1 // 2), (bx1 + 14, by0 - h1 - 10), (bx0 - w1 // 2, by0 - h1 - 14), (bx1 - w1, by1 + 12)])
draw(L1, s1[1], s1[2])
# 배 앞: 화살표 꼬리 쪽(왼쪽) → 아래 → 위
fx, fy, fw, fh = front; L2 = ["터틀볼이", "배를 받쳐", "중심 잡아 줌"]; w2, h2 = size(L2)
s2 = best(L2, [(fx - w2 - 14, fy - h2 // 2), (fx - w2 - 14, fy + 30), (fx - w2 // 2, fy + fh + 40)] + [(fx - w2 - dx, fy - h2 - 60) for dx in (40, 80, 120, 160)])
draw(L2, s2[1], s2[2])
# 원리 한 줄: 위쪽 빈 곳
L3 = ["터틀볼이 앞뒤로 받쳐 줘서", "몸의 중심이 잡혀요"]   # 10-23 사용자: "몸을 받쳐줘서 중심이 잡힌다는 느낌" (한 줄은 얼굴에 닿아 두 줄)
w3, h3 = size(L3)
s3 = best(L3, [(x, y) for y in (220, 260, 300) for x in (300, 420, 540, 660)], ymin=20)   # 원리 문구는 잘린 영역 (사용자가 뺌)
draw(L3, s3[1], s3[2])
out.save(OUT)
print("labels", s1, s2, s3)
