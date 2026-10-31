"""B캠 흰 배경지 밖(왼쪽 사무실 커튼·검은 띠)을 흰 벽으로 덮는 합성 이미지 만들기 (2026-10-31 이효석님, 사용자: "왼쪽 흰 배경지 벗어난 공간 합성할 이미지 제작해서 넣어줘")
  .venv/bin/python scripts/cutswitch/backdrop_extend.py <out.png> <렌더 PNG...>  (같은 클립 렌더 여러 장 — 중간값으로 사람 움직임 지움)
- 배경지 왼쪽 끝 = 줄마다 오른쪽 벽색과 같은 밝기가 60px 이어지기 시작하는 곳의 95% 값 + 12px, 세로 한 줄 (경계 그림자 덮음). 그 오른쪽 30px에서 실제 벽과 섞음
- 책상 윗면 = 커튼 열에서 책상 흰색(>205)이 시작하는 줄을 재서 **책상 모서리에서 꺾이는 두 직선**으로 맞춤 → 검은 띠·배경지 끝 아래까지 그 선대로 이어 그림
  (시안 3 사용자 지적: 수평선으로 그어 어색함 / 배경지 끝 아래 그림자 남음)
- 벽 채우기 = 줄마다 실제 벽색(+잡음), 책상선에서 2px 섞음. 검은 띠의 책상 부분 = 바로 오른쪽 책상색
- 화면 맨 아래 검은 물체(밝기 <120, x < 배경지 끝) = 위쪽 책상색으로 덮음 (시안 3 사용자 지적)
"""
import sys, numpy as np
from PIL import Image
out, srcs = sys.argv[1], sys.argv[2:]
im = np.median(np.stack([np.asarray(Image.open(p).convert("RGB")).astype(float) for p in srcs]), 0)
H, W, _ = im.shape; L = im.mean(2)
black = int(np.argmax(L[H // 2] > 20))
# 배경지 끝
E = []
for y in range(H * 3 // 4):
    ref = np.median(L[y, 640:700]); ok = np.abs(L[y] - ref) < 6
    E.append(next((x for x in range(black + 1, 700) if ok[x:x + 60].all()), 640))
EDGE = int(np.percentile(E, 95)) + 12; BLEND = 30; RIGHT = EDGE + BLEND
# 책상 윗면 두 직선
xs, ts = [], []
for x in range(black + 4, EDGE - 30, 6):
    col = L[:, x]; t = next((y for y in range(650, H - 25) if (col[y:y + 20] > 205).all()), None)
    if t: xs.append(x); ts.append(t)
xs, ts = np.array(xs), np.array(ts); k = int(np.argmin(ts)); xc = xs[k]
pl = np.polyfit(xs[:k + 1], ts[:k + 1], 1) if k >= 2 else np.polyfit(xs, ts, 1)
pr = np.polyfit(xs[k:], ts[k:], 1) if len(xs) - k >= 3 else pl
X = np.arange(W); T = np.where(X <= xc, np.polyval(pl, X), np.polyval(pr, X))
# 벽색: 줄마다 실제 벽 (책상 위 줄까지만 재고, 그 아래는 마지막 값)
wall = np.zeros((H, 3)); lim = int(np.polyval(pr, RIGHT + 80)) - 4
tab = np.zeros((H, 3))
for y in range(H): tab[y] = np.median(im[y, black + 6:black + 40], 0)
for y in range(H): wall[y] = np.median(im[y, RIGHT:RIGHT + 80], 0) if y <= lim else tab[y]   # 오른쪽 벽이 책상에 가려진 줄(왼쪽 끝 책상선 위)은 바로 옆 색 — 밝은 벽색을 그대로 쓰면 왼쪽 끝에 밝은 줄 (시안 4)
noise = np.random.default_rng(0).normal(0, 1.2, (H, W, 1))
fill = im.copy(); alpha = np.zeros((H, W))
# 책상 바로 위 벽 밝기 = 실제 화면(배경지 안쪽)의 '벽/책상' 비율 그대로 → 경계선이 오른쪽처럼 또렷 (시안 6 사용자: 왼쪽 책상 경계가 흐릿)
DR = 40; ratio = np.ones((DR + 1, 3))
refx = range(RIGHT + 30, RIGHT + 110, 4)
for d in range(1, DR + 1):
    ratio[d] = np.median([im[int(T[x]) - d, x] / np.maximum(im[int(T[x]) + 4, x], 1) for x in refx], 0)
for x in range(black + 3, RIGHT + 1):      # 배경지 밖(검은 띠 오른쪽): 책상선 위는 벽, 아래는 실제 책상
    a_x = 1.0 if x < EDGE else (RIGHT - x) / BLEND
    t = int(round(T[x])); table = im[min(t + 4, H - 1), x]
    for y in range(t + 1):
        d = t - y
        if d <= DR and d >= 1:
            w = (d / DR) ** 0.7
            fill[y, x] = table * ratio[d] * (1 - w) + wall[y] * w
        elif d == 0:
            fill[y, x] = table * ratio[1] * 0.5 + table * 0.5     # 경계 1px
        else:
            fill[y, x] = wall[y]
        alpha[y, x] = a_x
comp = im * (1 - alpha[..., None]) + fill * alpha[..., None]
# 검은 띠: 바로 오른쪽 열(합성 결과)을 책상선 기울기만큼 위아래로 옮겨 채움 — 색이 이어지고 선도 기울기대로 (시안 4: 띠 책상색이 진하고 경계가 보임)
xr = black + 28; tr = T[xr]   # 원래 화면 왼쪽 끝은 렌즈 주변부라 어두움 → 28px 안쪽 열에서 가져오고 띠 오른쪽 25px에 걸쳐 섞음 (시안 5)
for x in range(0, black + 25):
    d = int(round(T[x] - tr))
    for y in range(H):
        yy = min(max(y - d, 0), H - 1) if y >= T[x] - 1 else min(y, int(tr) - 3)
        if x >= black + 3 and y < T[x] + 2: continue   # 띠 오른쪽 섞는 열: 책상선 위(벽)는 앞에서 덮은 그대로
        fill[y, x] = comp[yy, xr]; alpha[y, x] = 1.0 if x < black + 3 else (black + 25 - x) / 22
# 맨 아래 검은 물체
dark = (L < 120); dark[:, :black + 3] = False; dark[:H - 60, :] = False; dark[:, EDGE:] = False
ys, xs2 = np.nonzero(dark)
if len(xs2):
    x0, x1 = max(xs2.min() - 25, 0), xs2.max() + 25; y0 = ys.min() - 18
    ref = np.median(im[y0 - 25:y0 - 5, x0:x1], 0)              # 위쪽 책상색 (열마다)
    for y in range(y0, H):
        for x in range(x0, x1):
            w = min(1.0, (y - y0) / 10, (x - x0) / 12, (x1 - x) / 12)
            fill[y, x] = ref[x - x0]; alpha[y, x] = max(alpha[y, x], w)
rgba = np.dstack([np.clip(fill + noise, 0, 255), alpha * 255]).astype(np.uint8)
Image.fromarray(rgba).save(out)
prev = (im * (1 - alpha[..., None]) + np.clip(fill + noise, 0, 255) * alpha[..., None]).astype(np.uint8)
Image.fromarray(prev).save(out.replace(".png", "_미리보기.jpg"), quality=92)
print("배경지 끝", EDGE, "검은 띠", black, "책상 모서리", int(xc), int(T[xc]), "왼쪽 끝 책상 y", int(T[0]), "배경지 끝 책상 y", int(T[EDGE]), "아래 물체", (int(xs2.min()), int(xs2.max())) if len(xs2) else None)
