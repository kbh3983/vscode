"""교양 에이전트 — 필름 그레인 / TV 노이즈 (회색 바탕, 오버레이 혼합용) (2026-10-18)
사용자: "좀 더 질감을 넣고 싶고, …" — 투명 배경에 옅은 그레인을 넣으면 프리미어에서 실제보다 진하게 그려져서 따로 만듦
  → "노이즈를 더 진하게 올렸으면 해. 수정해줘. 티비 노이즈 효과처럼." (tv 모드)
  python make_grain.py <출력 .mov> [초=5] [세기=10] [씨앗=7] [모드=film|tv]
- film: 50% 회색 위 고운 입자(반 해상도 노이즈를 키움)
- tv: 고운 입자 + 작은 덩어리 입자, 구역마다 세기가 불규칙하게 일렁임 (규칙적인 가로 주사선·띠는 어색해서 뺌), 가끔 아주 약한 가로줄, 미세한 깜박임
- 프리미어에서 혼합 모드 "오버레이"(불투명도 효과 혼합 모드 값 19)로 올리면 회색은 사라지고 질감만 남음. 세기는 클립 불투명도로
- ProRes 422 HQ (투명도 없음)
"""
import os, subprocess, sys, tempfile
import numpy as np
from PIL import Image
out = sys.argv[1]; sec = float(sys.argv[2]) if len(sys.argv) > 2 else 5; amt = float(sys.argv[3]) if len(sys.argv) > 3 else 10
seed = int(sys.argv[4]) if len(sys.argv) > 4 else 7; mode = sys.argv[5] if len(sys.argv) > 5 else "film"
W, H, FPS = 1920, 1080, 30000 / 1001; N = int(round(sec * FPS)); NR = np.random.default_rng(seed); tmp = tempfile.mkdtemp()
for f in range(N):
    if mode == "tv":
        # 2026-10-18 "너무 좌우로 지직거리는데, 좀 더 규칙적이지 않게" → 주사선·흘러가는 띠 뺌, 가로줄 잡음은 가끔·약하게
        #   고운 입자 + 작은 덩어리 입자를 섞고, 구역마다 세기가 달라지는 얼룩(저해상도 노이즈)이 매 프레임 일렁임
        fine = NR.normal(0, 1, (H, W)).astype(np.float32)
        clump = NR.normal(0, 1, (H // 3, W // 3)).astype(np.float32)
        clump = np.asarray(Image.fromarray(clump, "F").resize((W, H), Image.BILINEAR))
        mod = NR.normal(0, 1, (9, 16)).astype(np.float32)
        mod = np.asarray(Image.fromarray(mod, "F").resize((W, H), Image.BICUBIC))
        mod = np.clip(1 + mod * 0.35, 0.45, 1.6)
        g = (fine * 0.7 + clump * 0.6) * amt * mod
        if NR.random() < 0.15: g += NR.normal(0, 1, (H, 1)).astype(np.float32) * amt * 0.12   # 가끔 아주 약한 가로줄
        g += NR.normal(0, 2)                                                       # 프레임 밝기 깜박임 (약하게)
        v = np.clip(128 + g, 0, 255).astype(np.uint8)
    else:
        g = NR.normal(0, 1, (H // 2, W // 2)).astype(np.float32)
        g = np.asarray(Image.fromarray(g, "F").resize((W, H), Image.BILINEAR))
        v = np.clip(128 + g * amt, 0, 255).astype(np.uint8)
    Image.fromarray(v, "L").save(os.path.join(tmp, "f%04d.png" % f))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "30000/1001", "-i", os.path.join(tmp, "f%04d.png"),
                "-c:v", "prores_ks", "-profile:v", "3", "-pix_fmt", "yuv422p10le", "-vendor", "apl0", out], check=True)
print("->", out, N, "프레임", mode)
