"""지식인 클래스 칠판 바탕 질감 (2026-10-19, EP.21 실측: 평균 밝기 21.5·중앙 20, 5~95% 9~38, 가로로 쓸린 분필 자국 + 흰 점, 왼쪽·위아래 가장자리 어두움)
  python make_chalk_bg.py <출력.png>
"""
import sys, math
import numpy as np
from PIL import Image
W, H = 1920, 1080; rng = np.random.default_rng(21)
def blur(a, rx, ry):
    fy = np.fft.fftfreq(a.shape[0])[:, None]; fx = np.fft.rfftfreq(a.shape[1])[None, :]
    return np.fft.irfft2(np.fft.rfft2(a) * np.exp(-2 * math.pi ** 2 * ((rx * fx) ** 2 + (ry * fy) ** 2)), s=a.shape)
n = lambda: rng.standard_normal((H, W))
streak = blur(n(), 40, 0.8); streak /= streak.std()           # 가로로 쓸린 분필 자국
cloud = blur(n(), 160, 90); cloud /= cloud.std()                # 큰 얼룩
grain = blur(n(), 1.4, 0.7); grain /= grain.std()               # 잔결
img = 19 + 4.5 * np.maximum(streak, 0) ** 1.4 + 3.2 * cloud + 3.0 * grain
spk = rng.random((H, W)) < 0.014; img[spk] += rng.uniform(8, 45, spk.sum())   # 흰 분필 가루 (1px, 촘촘히)
spk3 = rng.random((H, W)) < 0.0012; img[spk3] += rng.uniform(40, 110, spk3.sum())
spk2 = blur((rng.random((H, W)) < 0.00015).astype(float) * 300, 0.9, 0.9); img += spk2
x = np.linspace(0, 1, W)[None, :]; y = np.linspace(0, 1, H)[:, None]
vig = (0.55 + 0.45 * np.clip(x / 0.22, 0, 1) ** 0.6) * (0.82 + 0.18 * np.sin(np.pi * y) ** 0.5) * (0.9 + 0.1 * np.clip((1 - x) / 0.15, 0, 1))
img = np.clip(img * vig, 0, 255)
Image.fromarray(np.dstack([img] * 3).astype(np.uint8)).save(sys.argv[1])
print("평균", img.mean().round(1), "분위", np.percentile(img, [5, 50, 95]).round(0))
