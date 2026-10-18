"""어두운 펠트·종이 질감 노이즈 배경 10초 (2026-10-19)
사용자: "테스트영상 시퀀스 열린 것 2분 40초에 있는 노이즈 화면 참고해서 최대한 유사하게 10초 분량으로 만들어줘. 안에 텍스트는 제외하고."
레퍼런스(문해력 영상 0~7초) 실측: 질감 한 장을 30프레임(1초) 그대로 두고 다음 장으로 바꿈. 장마다 밝기 평균 9.6~15.7, 잔결(3px 위) 표준 2.3~5.6,
  큰 얼룩 1.2~1.8, 밝은 점(>25) 0.4~3%, 짧은 섬유(4~30px 휘어진 선)가 흩어짐. 회색(색 없음). 1초 안에서도 먼지 한두 개가 몇 프레임 나타났다 사라짐
  python make_felt_noise.py <출력 폴더> [초=10]
"""
import sys, os, math, subprocess
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

OUT = sys.argv[1]; SEC = int(sys.argv[2]) if len(sys.argv) > 2 else 10
W, H, FPS = 1920, 1080, 30000 / 1001
os.makedirs(OUT, exist_ok=True)
# 레퍼런스 5장 실측값 (평균, 잔결 표준, 결 크기 px, 밝은 점 비율 목표, 섬유 수)
REF = [(14.9, 2.3, 1.6, 0.0044, 260), (11.1, 3.7, 1.2, 0.0092, 380), (9.6, 5.6, 0.7, 0.0316, 520), (10.4, 3.1, 1.3, 0.0069, 300), (15.7, 2.9, 1.5, 0.0089, 260)]

def blur(a, r):   # 가우시안 흐림 (FFT, 가장자리 이어짐)
    fy = np.fft.fftfreq(a.shape[0])[:, None]; fx = np.fft.rfftfreq(a.shape[1])[None, :]
    k = np.exp(-2 * (math.pi * r) ** 2 * (fx ** 2 + fy ** 2))
    return np.fft.irfft2(np.fft.rfft2(a) * k, s=a.shape)

def texture(seed, mean, hi_std, grain, bright, fibers):
    rng = np.random.default_rng(seed)
    mott = blur(rng.standard_normal((H, W)), 40); mott = mott / mott.std() * 1.4
    # 레퍼런스 결 = 가장자리가 또렷한 얼룩(3~6px) + 아주 잔 점 → 흐린 잡음을 tanh로 눌러 경계를 세움
    g = blur(rng.standard_normal((H, W)), grain * 1.3); g = np.tanh(2.2 * g / g.std())
    g2 = blur(rng.standard_normal((H, W)), grain * 3.0); g2 = np.tanh(1.6 * g2 / g2.std())
    g3 = blur(rng.standard_normal((H, W)), 0.55); g3 = g3 / g3.std()
    t = 0.8 * g + 0.22 * g2 + 0.5 * g3
    t = t + 0.25 * np.maximum(0, t - 0.8) ** 2   # 밝은 쪽 꼬리 조금
    t = (t - t.mean()) / t.std() * hi_std
    img = mean + mott + t
    # 섬유: 짧게 휘어진 선, 1px, 배경보다 15~60 밝게
    fib = Image.new("L", (W, H), 0); d = ImageDraw.Draw(fib)
    for _ in range(fibers):
        x, y = rng.uniform(0, W), rng.uniform(0, H); ang = rng.uniform(0, 2 * math.pi)
        L = int(rng.choice([rng.uniform(3, 8), rng.uniform(7, 14), rng.uniform(13, 24)], p=[0.6, 0.32, 0.08]))
        curv = rng.normal(0, 0.035); b = int(rng.uniform(22, 60) if rng.random() < 0.88 else rng.uniform(60, 120))
        pts = [(x, y)]
        for _ in range(L):
            ang += curv + rng.normal(0, 0.02); x += math.cos(ang); y += math.sin(ang); pts.append((x, y))
        d.line(pts, fill=b, width=1)
    # 아주 짧은 밝은 실(1~3px) — 레퍼런스 밝은 점(>25) 비율에 맞춰 개수
    for _ in range(int(bright * W * H / 2.6)):
        x, y = rng.uniform(0, W), rng.uniform(0, H); a2 = rng.uniform(0, math.pi); l = rng.uniform(0.6, 2.6)
        d.line([(x, y), (x + math.cos(a2) * l, y + math.sin(a2) * l)], fill=int(rng.uniform(16, 42)), width=1)
    # 먼지 알갱이 몇 개
    for _ in range(int(fibers * 0.05)):
        x, y = rng.uniform(0, W), rng.uniform(0, H); r = rng.uniform(0.6, 1.6)
        d.ellipse((x - r, y - r, x + r, y + r), fill=int(rng.uniform(30, 90)))
    fib = np.asarray(fib.filter(ImageFilter.GaussianBlur(0.45)), dtype=np.float64)
    img = img + fib
    # 밝은 점 비율 맞추기 (잔결 꼬리 세기 조절)
    return np.clip(img, 0, 255)

def stats(a):
    hi = (a - blur(a, 3)).std(); return a.mean(), hi, (a > 25).mean()

texs = []
for i in range(SEC):
    m, s, gr, br, fb = REF[i % 5]
    rng = np.random.default_rng(100 + i)
    m *= rng.uniform(0.95, 1.05); s *= rng.uniform(0.92, 1.08)
    a = texture(1000 + i, m, s, gr, br, fb)
    mm, hh, bb = stats(a)
    texs.append(a); print(f"장 {i}: 평균 {mm:.1f} 잔결 {hh:.2f} 밝은점 {bb:.4f}  (목표 {m:.1f} {s:.2f} {br:.4f})")

N = int(round(SEC * FPS)); rng = np.random.default_rng(7)
# 1초 안 먼지: 장마다 1~2개, 2~6프레임
events = []
for i in range(SEC):
    for _ in range(rng.integers(1, 3)):
        f0 = int(i * FPS + rng.uniform(3, 24)); events.append((f0, f0 + int(rng.integers(2, 7)), rng.uniform(0, W), rng.uniform(0, H), rng.uniform(1.2, 3), rng.uniform(25, 60)))
fdir = os.path.join(OUT, "frames"); os.makedirs(fdir, exist_ok=True)
for f in range(N):
    i = min(SEC - 1, int(f / FPS)); a = texs[i]
    ev = [e for e in events if e[0] <= f < e[1]]
    if ev:
        im = Image.fromarray(a.astype(np.uint8)); d = ImageDraw.Draw(im)
        for e in ev: d.ellipse((e[2] - e[4], e[3] - e[4], e[2] + e[4], e[3] + e[4]), fill=int(min(255, a[int(e[3]) % H, int(e[2]) % W] + e[5])))
        out = im
    else:
        out = Image.fromarray(a.astype(np.uint8))
    out.convert("RGB").save(os.path.join(fdir, f"f_{f:04d}.png"), compress_level=1)
mov = os.path.join(OUT, f"펠트노이즈_어두운배경_{SEC}초.mov")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "30000/1001", "-i", os.path.join(fdir, "f_%04d.png"), "-c:v", "prores_ks", "-profile:v", "3", "-pix_fmt", "yuv422p10le", "-vendor", "apl0", mov], check=True)
print("->", mov, N, "프레임")
