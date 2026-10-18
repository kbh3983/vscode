"""교양 에이전트 — 필름 먼지 합성용 영상 (배경 투명, ProRes 4444) (2026-10-18)
사용자: "먼지, 스크래치 효과 합성해서 넣고 싶어서, 배경 투명하게 5초 분량으로 만들어서 클립 맨 뒤에 넣어줘."
  → "일자로 길게 있는 스크래치는 어색하다, 없애주고 먼지 느낌을 더 살려서 수정해줘" (세로 스크래치 뺌)
  → "좀 더 스크래치 느낌이 추가되면 좋겠어, 이것도 과하진 않게" (짧은 긁힘 0~2개, 3~8프레임 깜박임, 대부분 흰색)
  → "좀 더 질감을 넣고 싶고, 스크래치도 좀 더 꼬불거리면서 자주 나오게" (필름 그레인 추가, 긁힘 1~3개·구불구불)
  → "꼬불꼬불 스크래치가 너무 가늘고 길다. 좀 더 자잘하게" (긁힘 8~45px·굵기 대부분 2px·3~6개·2~6프레임)
  python make_dust.py <출력 .mov> [초=5] [씨앗=7]
- 점·티끌: 1~2px가 대부분, 3~6px 가끔, 8~16px 울퉁불퉁 덩어리 드물게 (검정 위주 + 흰색 조금)
- 털·섬유: 30~150px 꼬불거리는 가는 곡선
- 흐린 먼지: 초점 나간 큰 얼룩 (흐림 + 낮은 불투명도)
- 대부분 1프레임, 일부는 2~3프레임 머물며 조금 움직임 (필름처럼 자리가 매번 바뀜)
- 프리미어에서 그대로 올리면 투명 배경 위에 겹침. 세기는 클립 불투명도로, 혼합 모드는 보통/곱하기/스크린 중 골라 씀
"""
import os, subprocess, sys, tempfile, random, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

out = sys.argv[1]; sec = float(sys.argv[2]) if len(sys.argv) > 2 else 5; seed = int(sys.argv[3]) if len(sys.argv) > 3 else 7
W, H, FPS = 1920, 1080, 30000 / 1001
N = int(round(sec * FPS)); R = random.Random(seed)
tmp = tempfile.mkdtemp()
DARK, LIGHT = (18, 17, 16), (238, 236, 230)


def color():
    return DARK if R.random() < 0.78 else LIGHT


def blob(d, x, y, r, c, a):   # 울퉁불퉁한 덩어리
    n = R.randint(7, 12); pts = []
    for k in range(n):
        t = k / n * math.pi * 2; rr = r * R.uniform(0.55, 1.15)
        pts.append((x + math.cos(t) * rr, y + math.sin(t) * rr * R.uniform(0.7, 1.0)))
    d.polygon(pts, fill=c + (a,))


def hair(d, x, y, c, a):   # 꼬불거리는 털
    L = R.uniform(25, 120); ang = R.uniform(0, math.pi * 2); n = 30; pts = [(x, y)]
    for k in range(n):   # 방향이 불규칙하게 바뀌는 털 (일정하게 휘면 동그란 호처럼 보여 어색함)
        ang += R.uniform(-0.45, 0.45)
        x += math.cos(ang) * L / n; y += math.sin(ang) * L / n; pts.append((x, y))
    for k in range(len(pts) - 1):   # 끝으로 갈수록 옅게
        t = k / (len(pts) - 1); d.line([pts[k], pts[k + 1]], fill=c + (int(a * (1 - 0.6 * abs(t - 0.4) / 0.6)),), width=1)


# 2026-10-18 사용자: "먼지 크기랑 양이 너무 많다. 줄여줘. 좀 더 느리게," → 먼지마다 모양을 정해 두고 6~16프레임 머물며 천천히 흘러감 (매 프레임 새로 뿌리지 않음)
#   동시에 보이는 점 8~14개(대부분 1~2px, 가끔 3px), 털 0~1개, 흐린 얼룩 1~2개. 나타나고 사라질 때 2프레임씩 옅게
def shape_blob(r):
    n = R.randint(7, 11); return [(math.cos(k / n * math.pi * 2) * r * R.uniform(0.6, 1.1), math.sin(k / n * math.pi * 2) * r * R.uniform(0.6, 1.0)) for k in range(n)]
def shape_hair():
    L_ = R.uniform(20, 70); ang = R.uniform(0, math.pi * 2); x = y = 0; pts = [(0, 0)]
    for k in range(24): ang += R.uniform(-0.4, 0.4); x += math.cos(ang) * L_ / 24; y += math.sin(ang) * L_ / 24; pts.append((x, y))
    return pts
def shape_scratch():   # 짧은 긁힘: 대체로 세로, 꼬불꼬불 (화면 끝까지 긴 일자 선은 어색 → 2026-10-18 사용자 피드백으로 뺌)
    # 2026-10-18 "스크래치도 좀 더 꼬불거리면서 자주 나오게" → 방향이 계속 바뀌는 구불구불한 선 (흔들림이 쌓임)
    L_ = R.uniform(8, 45); ang = math.pi / 2 + R.uniform(-0.6, 0.6); turn = 0; x = y = 0; pts = [(0, 0)]; n = max(5, int(L_ / 3))
    for k in range(n):
        turn = turn * 0.7 + R.uniform(-0.55, 0.55); a2 = ang + turn
        x += math.cos(a2) * L_ / n; y += math.sin(a2) * L_ / n; pts.append((x, y))
    return pts
def new_p(kind):
    life = R.randint(6, 16) if kind != "soft" else R.randint(10, 20)
    if kind == "scratch": life = R.randint(2, 6)
    if kind == "dot": r = R.choice([0.8, 1, 1, 1.2, 1.5, 1.5, 2, 2, 2.5, 3]); shp = None if r <= 2 else shape_blob(r)
    elif kind == "hair": r = 0; shp = shape_hair()
    elif kind == "scratch": r = 0; shp = shape_scratch()
    else: r = R.uniform(4, 10); shp = shape_blob(r)
    c = (LIGHT if R.random() < 0.75 else DARK) if kind == "scratch" else color()
    # 2026-10-18 "먼지 노이즈를 좀 더 진하게" → 점·털 110~210 → 190~255, 흐린 얼룩 50~100 → 90~160, 긁힘 160~230 → 200~255
    a = R.randint(190, 255) if kind in ("dot", "hair") else (R.randint(90, 160) if kind == "soft" else R.randint(200, 255))
    return {"k": kind, "x": R.uniform(0, W), "y": R.uniform(0, H), "r": r, "s": shp, "c": c, "a": a, "w": R.choice([1, 2, 2, 2, 3]),
            "life": life, "age": 0, "dx": R.uniform(-0.5, 0.5), "dy": R.uniform(-0.3, 0.6)}
WANT = {"dot": (8, 14), "hair": (0, 1), "soft": (1, 2), "scratch": (3, 6)}
parts = []
NR = np.random.default_rng(seed); GRAIN = 0   # 그레인 세기. 2026-10-18: 투명 영상 속 옅은 그레인은 프리미어에서 실제보다 진하게 그려짐 → 0으로 두고 make_grain.py(회색 바탕 + 오버레이)로 따로
for f in range(N):
    sharp = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ds = ImageDraw.Draw(sharp)
    soft = Image.new("RGBA", (W, H), (0, 0, 0, 0)); dz = ImageDraw.Draw(soft)
    crisp = Image.new("RGBA", (W, H), (0, 0, 0, 0)); dc = ImageDraw.Draw(crisp)   # 긁힘은 흐리지 않음 (흐리면 1px 선이 묻힘)
    for kind, (lo, hi) in WANT.items():
        n = sum(1 for q in parts if q["k"] == kind)
        while n < R.randint(lo, hi): parts.append(new_p(kind)); n += 1
    for q in parts:
        q["x"] += q["dx"]; q["y"] += q["dy"]; q["age"] += 1
        fade = min(1.0, q["age"] / 2.0, (q["life"] - q["age"] + 1) / 2.0); a = int(q["a"] * max(0, fade))
        col = q["c"] + (a,); x, y = q["x"], q["y"]
        if q["k"] == "hair":
            pts = [(x + u, y + v) for u, v in q["s"]]; ds.line(pts, fill=col, width=1)
        elif q["k"] == "scratch":   # 깜박이며 x가 조금 흔들림
            if R.random() < 0.8:
                j = R.uniform(-1.5, 1.5); dc.line([(x + u + j, y + v) for u, v in q["s"]], fill=q["c"] + (int(a * R.uniform(0.6, 1.0)),), width=q["w"])
        elif q["s"] is None: ds.ellipse([x - q["r"], y - q["r"], x + q["r"], y + q["r"]], fill=col)
        else: (dz if q["k"] == "soft" else ds).polygon([(x + u, y + v) for u, v in q["s"]], fill=col)
    parts = [q for q in parts if q["age"] < q["life"]]
    sharp = sharp.filter(ImageFilter.GaussianBlur(0.35))   # 흐림 0.5 → 0.35 (먼지가 덜 퍼져 더 진하게)
    soft = soft.filter(ImageFilter.GaussianBlur(4))
    # 2026-10-18 "좀 더 질감을 넣고 싶고" → 필름 그레인: 고운 입자(반 해상도 노이즈를 키움), 밝은 입자 = 흰색·어두운 입자 = 검정, 불투명도 = 세기 (매 프레임 바뀜)
    if not GRAIN: Image.alpha_composite(Image.alpha_composite(soft, sharp), crisp).save(os.path.join(tmp, "f%04d.png" % f)); continue
    g = NR.normal(0, 1, (H // 2, W // 2)).astype(np.float32)
    g = np.asarray(Image.fromarray(g, "F").resize((W, H), Image.BILINEAR))
    ga = np.clip(np.abs(g) * GRAIN, 0, 255)
    ga = (np.where(np.abs(g) < 0.5, 0, np.round(ga / 6) * 6)).astype(np.uint8)   # 약한 입자는 0, 나머지는 6단계로 묶음 → 파일 크기 줄임
    gc = np.where(g > 0, 235, 15).astype(np.uint8)
    grain = Image.fromarray(np.dstack([gc, gc, gc, ga]), "RGBA")
    Image.alpha_composite(Image.alpha_composite(Image.alpha_composite(grain, soft), sharp), crisp).save(os.path.join(tmp, "f%04d.png" % f))


subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "30000/1001", "-i", os.path.join(tmp, "f%04d.png"),
                "-c:v", "prores_ks", "-profile:v", "4444", "-qscale:v", "28", "-pix_fmt", "yuva444p10le", "-vendor", "apl0", out], check=True)   # 그레인 때문에 기본 품질은 5초에 1.2GB → qscale 28 + 그레인 투명도 단계 묶음. 알파 8비트(-alpha_bits 8)는 프리미어에서 그레인이 거칠게 보여 쓰지 않음 (2026-10-18)
print("->", out, N, "프레임")
