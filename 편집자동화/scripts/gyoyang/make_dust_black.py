"""검은 바탕 필름 먼지 오버레이 v2 — 레퍼런스 프레임 단위 실측대로 (2026-10-19)
사용자: "시퀀스 1분 35초에 있는 노이즈 화면 새로 그려줘 최대한 유사하게." → "디테일이 완전히 달라, 프레임 단위로 자세히 분석해서 다시 수정해줘."
레퍼런스(watermarked_preview.mp4 960×540) 실측 (noise_ref2/comp_stats.py):
  · 먼지 '한 장'이 통째로 1~4프레임 멈춰 있다가 통째로 바뀜 (유지 1:27 · 2:32 · 3:45 · 4:34 장)
  · 장마다 먼지 수가 크게 다름: 덩어리 수 10% 9 · 중앙 50 · 90% 203
  · 크기별 장당 개수·최고 밝기 (960 기준): 1px 29개 25 / 2~3px 32개 37 / 4~8px 17개 61 / 9~20px 5개 82 / 21~60px 1.2개 85 / 61px+ 0.2개 89
  · 모양: 잔 점, 납작하고 들쭉날쭉한 조각, 초승달·갈고리, 점선 사슬, 뾰족한 쐐기 흠집(긴 것) — 가운데가 밝고 가장자리로 흐려짐, 바탕은 완전 검정
  960 기준으로 설계하고 1920×1080에 2배로 그림
  python make_dust_black.py <출력.mov> [초=12.2]
"""
import sys, os, math, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1]; SEC = float(sys.argv[2]) if len(sys.argv) > 2 else 12.2
W, H, FPS, S = 1920, 1080, 30000 / 1001, 2.0      # S = 960 기준 → 1920 배율
N = int(round(SEC * FPS)); rng = np.random.default_rng(21)
SZ, BR = 0.62, 1.9   # 실측 비교로 맞춘 크기·밝기 보정 (2배로 그렸다 줄이면 커지고 어두워져서)
HOLD = [1] * 27 + [2] * 32 + [3] * 45 + [4] * 34
CAT = [  # (장당 개수, 960 기준 길이 범위, 최고 밝기, 종류들)
    (29, (1, 1), 25, ["speck"]),
    (32, (1.2, 2.0), 37, ["speck", "flake"]),
    (12, (2.5, 4), 61, ["flake", "flake", "dash", "hair"]),
    (4, (4, 7), 82, ["flake", "hook", "hair", "flake", "hair"]),
    (1.2, (7, 13), 85, ["flake", "hook", "chain", "hair", "hair"]),
    (0.2, (35, 75), 89, ["wedge", "chain", "wedge"]),
]

def blob(d, cx, cy, r, val, elong=1.0, ang=0.0):   # 들쭉날쭉한 납작 조각
    n = 9; pts = []
    for i in range(n):
        t = 2 * math.pi * i / n; rr = r * rng.uniform(0.55, 1.15)
        x, y = math.cos(t) * rr * elong, math.sin(t) * rr
        pts.append((cx + x * math.cos(ang) - y * math.sin(ang), cy + x * math.sin(ang) + y * math.cos(ang)))
    d.polygon(pts, fill=val)

def draw_item(d, kind, L, peak, x, y):
    v = int(np.clip(peak * (BR if peak < 70 else 1.45) * rng.uniform(0.8, 1.15), 18, 160)); ang = rng.uniform(0, math.pi)
    Ls = L * S * SZ
    if kind == "speck":
        r = 0.5 if L <= 1 else max(0.6, Ls / 2) * rng.uniform(0.8, 1.2); d.ellipse((x - r, y - r, x + r, y + r), fill=v)
    elif kind == "flake":
        blob(d, x, y, Ls / 2, v, rng.uniform(1.0, 2.2), ang)
        if rng.random() < 0.4: blob(d, x + rng.normal(0, Ls / 3), y + rng.normal(0, Ls / 3), Ls / 4, int(v * 0.8))
        if L >= 2.5 and rng.random() < 0.45:   # 둘레 잔 부스러기 (레퍼런스 조각 옆 흩어진 점)
            for _ in range(int(rng.integers(2, 9))):
                qx, qy = x + rng.normal(0, Ls * 1.4 + 3 * S), y + rng.normal(0, Ls * 1.4 + 3 * S); r = rng.uniform(0.4, 0.9) * S
                d.ellipse((qx - r, qy - r, qx + r, qy + r), fill=int(v * rng.uniform(0.3, 0.7)))
    elif kind == "dash":
        dx, dy = math.cos(ang) * Ls / 2, math.sin(ang) * Ls / 2; d.line([(x - dx, y - dy), (x + dx, y + dy)], fill=v, width=max(1, int(S * rng.uniform(0.6, 1.2))))
    elif kind == "hook":   # 초승달·갈고리
        r = Ls / 2; a0 = rng.uniform(0, 360); span = rng.uniform(100, 220)
        d.arc((x - r, y - r, x + r, y + r), a0, a0 + span, fill=v, width=max(1, int(S * rng.uniform(0.8, 1.6))))
    elif kind == "hair":
        pts = [(x, y)]; a = ang; c = rng.normal(0, 0.15)
        for _ in range(int(Ls)): a += c; x += math.cos(a); y += math.sin(a); pts.append((x, y))
        d.line(pts, fill=v, width=max(1, int(S * 0.7)))
    elif kind == "chain":   # 끊긴 점선 사슬 (거의 가로)
        a = rng.normal(0, 0.25) + (math.pi if rng.random() < .5 else 0); px, py = x, y; done = 0
        while done < Ls:
            seg = rng.uniform(1.5, 5) * S; gap = rng.uniform(1.5, 6) * S
            qx, qy = px + math.cos(a) * seg, py + math.sin(a) * seg
            d.line([(px, py), (qx, qy)], fill=int(v * rng.uniform(0.6, 1)), width=max(1, int(S * rng.uniform(0.8, 1.5))))
            if rng.random() < 0.4: blob(d, qx, qy, S * rng.uniform(0.8, 1.6), v)
            px, py = qx + math.cos(a) * gap, qy + math.sin(a) * gap; done += seg + gap
    elif kind == "wedge":   # 뾰족한 쐐기 흠집 (한쪽 굵고 끝이 가늘게, 가장자리 들쭉날쭉)
        wmax = rng.uniform(2, 5) * S; n = 14; up, dn = [], []
        for i in range(n + 1):
            t = i / n; px, py = x + math.cos(ang) * Ls * t, y + math.sin(ang) * Ls * t
            wv = wmax * (1 - t) ** 0.8 * rng.uniform(0.6, 1.2) + 0.5
            nx, ny = -math.sin(ang), math.cos(ang); up.append((px + nx * wv, py + ny * wv)); dn.append((px - nx * wv * 0.4, py - ny * wv * 0.4))
        d.polygon(up + dn[::-1], fill=v)
        for _ in range(int(rng.integers(2, 7))):   # 둘레 부스러기
            t = rng.random(); blob(d, x + math.cos(ang) * Ls * t + rng.normal(0, 3 * S), y + math.sin(ang) * Ls * t + rng.normal(0, 3 * S), S * rng.uniform(0.5, 1.2), int(v * 0.8))

def plate():
    im = Image.new("L", (W, H), 0); d = ImageDraw.Draw(im)
    dens = float(np.clip(rng.lognormal(-0.15, 1.05), 0.12, 5.0))   # 장마다 먼지 양 (9/50/203 퍼짐)
    # 몰림: 장마다 한두 군데 진한 자리
    hot = [(rng.uniform(0, W), rng.uniform(0, H), rng.uniform(150, 450)) for _ in range(int(rng.integers(0, 3)))]
    def where():
        if hot and rng.random() < 0.35:
            hx, hy, hr = hot[int(rng.integers(len(hot)))]; return hx + rng.normal(0, hr / 2), hy + rng.normal(0, hr / 2)
        return rng.uniform(0, W), rng.uniform(0, H)
    for cnt, (l0, l1), peak, kinds in CAT:
        for _ in range(rng.poisson(cnt * dens)):
            x, y = where(); draw_item(d, kinds[int(rng.integers(len(kinds)))], rng.uniform(l0, l1), peak, x, y)
    # 가운데 밝고 가장자리 흐린 느낌: 살짝 흐리고 원래 밝기로 되돌림
    a = np.asarray(im, dtype=np.float32); b = np.asarray(im.filter(ImageFilter.GaussianBlur(0.6)), dtype=np.float32)
    out = np.where(a > 0, 0.7 * a + 0.3 * b, b * 0.8)
    # 조각 속 얼룩 (레퍼런스: 속이 꽉 찬 흰색이 아니라 회색 결이 있음) — 1~2px 잡음을 곱함
    tex = np.asarray(Image.fromarray((rng.random((H, W)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.1)), dtype=np.float32) / 255
    tex = 0.62 + 0.75 * (tex - 0.5) * 3.0; out = out * np.clip(tex, 0.35, 1.15)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

tmp = tempfile.mkdtemp(); f = 0
while f < N:
    p = plate().convert("RGB"); hold = HOLD[int(rng.integers(len(HOLD)))]
    for _ in range(hold):
        if f >= N: break
        p.save(os.path.join(tmp, f"f_{f:04d}.png"), compress_level=1); f += 1
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "30000/1001", "-i", os.path.join(tmp, "f_%04d.png"), "-c:v", "prores_ks", "-profile:v", "3", "-pix_fmt", "yuv422p10le", "-vendor", "apl0", OUT], check=True)
print("->", OUT, N, "프레임", "임시", tmp)
