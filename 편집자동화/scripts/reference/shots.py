"""레퍼런스 분석 — 컷(cuts.json) 사이 샷마다 가운데 프레임을 뽑아 번호 붙인 시트 + shots.json
  python shots.py <영상> <분석 폴더>   → <폴더>/shots.json [{i, s, e, dur, f0, f1, tin}], <폴더>/shots/sh_XX.jpg
점진 전환(디졸브 등)은 전환 구간을 샷 경계로 본다 (앞 샷 끝 = 전환 시작, 다음 샷 시작 = 전환 끝)
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

src, d = sys.argv[1], sys.argv[2]
C = json.load(open(os.path.join(d, "cuts.json"))); fps = C["fps"]; n = C["n"]
b = []   # (경계 시작 프레임, 경계 끝 프레임, 종류)
for c in C["cuts"]: b.append((c["f"], c["f"] + c["len"] - 1, c["kind"], c["len"]))
S = []; prev_end = 0; prev_kind = "start"
for f0, f1, k, ln in b:
    if f0 - prev_end >= 3: S.append(dict(f0=prev_end, f1=f0 - 1, tin=prev_kind))
    prev_end = f1 + 1 if k == "cut" else f1 + 1; prev_kind = k if k == "cut" else f"{k}{ln}"
S.append(dict(f0=prev_end, f1=n - 1, tin=prev_kind))
for i, s in enumerate(S):
    s.update(i=i, s=round(s["f0"] / fps, 3), e=round((s["f1"] + 1) / fps, 3)); s["dur"] = round(s["e"] - s["s"], 3)
json.dump(S, open(os.path.join(d, "shots.json"), "w"), indent=0)
os.makedirs(os.path.join(d, "shots"), exist_ok=True)
font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 15)
W, H = 320, 180
def grab(t):
    x = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1", "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return Image.fromarray(np.frombuffer(x, np.uint8).reshape(H, W, 3)) if len(x) == W * H * 3 else Image.new("RGB", (W, H))
T = []
for s in S:
    im = grab((s["s"] + s["e"]) / 2); dr = ImageDraw.Draw(im)
    m, sec = divmod(s["s"], 60); lab = f"#{s['i']} {int(m):02d}:{sec:05.2f} {s['dur']:.1f}s {s['tin']}"
    dr.rectangle([0, 0, 8 * len(lab) + 6, 19], fill=(0, 0, 0)); dr.text((3, 0), lab, fill=(255, 255, 0), font=font)
    T.append(im)
for k in range(0, len(T), 48):
    sh = Image.new("RGB", (8 * W, 6 * H))
    for j, t in enumerate(T[k:k + 48]): sh.paste(t, ((j % 8) * W, (j // 8) * H))
    sh.save(os.path.join(d, "shots", f"sh_{k // 48:02d}.jpg"), quality=85)
d2 = np.array([s["dur"] for s in S])
print("샷", len(S), "평균 %.2f초 중앙 %.2f초" % (d2.mean(), np.median(d2)))
