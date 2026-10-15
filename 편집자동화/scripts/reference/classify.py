"""레퍼런스 분석 — 샷 가운데 프레임으로 비슷한 화면끼리 묶기 (카메라 앵글·자료화면 구분용)
  python classify.py <영상> <분석 폴더> [묶음 수=10]  → shots.json 에 grp 추가, groups.jpg (묶음마다 샷 6개)
특징: 64×36 흑백 + 색 평균 3개 (작게) → k-평균 (numpy, 초기값 고정)
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

src, d = sys.argv[1], sys.argv[2]; K = int(sys.argv[3]) if len(sys.argv) > 3 else 10
S = json.load(open(os.path.join(d, "shots.json")))
F, TH = [], []
for s in S:
    t = s["s"] + min(s["dur"] / 2, max(0.3, s["dur"] - 0.3))
    x = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1", "-vf", "scale=64:36", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    a = np.frombuffer(x, np.uint8).reshape(36, 64, 3).astype(np.float32) / 255 if len(x) == 64 * 36 * 3 else np.zeros((36, 64, 3), np.float32)
    g = a.mean(2); F.append(np.concatenate([g.ravel(), a.reshape(-1, 3).mean(0) * 8]))
    TH.append(Image.fromarray((a * 255).astype(np.uint8)).resize((256, 144)))
F = np.array(F); rng = np.random.default_rng(0)
C = F[rng.choice(len(F), K, replace=False)]
for _ in range(50):
    lab = ((F[:, None] - C[None]) ** 2).sum(2).argmin(1)
    C = np.array([F[lab == k].mean(0) if (lab == k).any() else C[k] for k in range(K)])
for s, l in zip(S, lab): s["grp"] = int(l)
json.dump(S, open(os.path.join(d, "shots.json"), "w"), indent=0)
font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 14)
sh = Image.new("RGB", (256 * 7, 144 * K))
for k in range(K):
    idx = [i for i in range(len(S)) if lab[i] == k]; tot = sum(S[i]["dur"] for i in idx)
    lab_im = Image.new("RGB", (256, 144)); dr = ImageDraw.Draw(lab_im)
    dr.text((8, 40), f"묶음 {k}\n샷 {len(idx)}개\n{tot:.0f}초", fill=(255, 255, 0), font=font); sh.paste(lab_im, (0, 144 * k))
    for j, i in enumerate(idx[:6]):
        im = TH[i].copy(); ImageDraw.Draw(im).text((3, 2), f"#{i}", fill=(255, 255, 0), font=font); sh.paste(im, (256 * (j + 1), 144 * k))
sh.save(os.path.join(d, "groups.jpg"), quality=85)
for k in range(K):
    idx = [i for i in range(len(S)) if lab[i] == k]
    print(k, len(idx), "%.0f초" % sum(S[i]["dur"] for i in idx), idx[:40])
