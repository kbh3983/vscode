"""레퍼런스 분석 — 같은 카메라 샷끼리 확대 배율(펀치인) 재기 (2026-10-27 놀심)
  python zoom.py <영상> <분석 폴더(shots.json)> [기준샷 번호=가장 넓은 샷 자동]
  python zoom.py <영상> <분석 폴더> dense [간격초=0.5]  → zoom_dense.json : 간격마다 {t, scale, dx, dy} (샷 안 천천히 확대·놓친 확대 컷 찾기, 기준은 zoom.json 기준샷)
  → zoom.json : 샷마다 {i, s, e, scale(기준 대비), dx, dy, ok}  — 기준 샷과 특징점(ORB)이 맞지 않으면 ok=false (스톡·다른 화면)
샷 가운데 프레임을 960 폭으로 읽어 기준 프레임과 닮음변환(estimateAffinePartial2D)으로 배율·이동을 구함.
"""
import json, os, subprocess, sys
import numpy as np, cv2

src, d = sys.argv[1], sys.argv[2]
shots = json.load(open(os.path.join(d, "shots.json"), encoding="utf-8"))
W, H = 960, 540

def grab(t):
    b = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1", "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
    return np.frombuffer(b, np.uint8).reshape(H, W)

orb = cv2.ORB_create(3000)
mask = np.full((H, W), 255, np.uint8); mask[int(H * 0.78):] = 0          # 아래 자막 자리 빼기
frames = [grab((s["s"] + s["e"]) / 2) for s in shots]
kd = [orb.detectAndCompute(f, mask) for f in frames]
bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

def rel(a, b):
    ka, da = kd[a]; kb, db = kd[b]
    if da is None or db is None or len(ka) < 30 or len(kb) < 30: return None
    m = sorted(bf.match(da, db), key=lambda x: x.distance)[:400]
    if len(m) < 30: return None
    pa = np.float32([ka[x.queryIdx].pt for x in m]); pb = np.float32([kb[x.trainIdx].pt for x in m])
    M, inl = cv2.estimateAffinePartial2D(pb, pa, method=cv2.RANSAC, ransacReprojThreshold=3)
    if M is None or inl.sum() < 25: return None
    sc = float(np.hypot(M[0, 0], M[1, 0]))
    return 1 / sc, float(M[0, 2]), float(M[1, 2]), int(inl.sum())

if len(sys.argv) > 3 and sys.argv[3] == "dense":
    Z = json.load(open(os.path.join(d, "zoom.json"), encoding="utf-8")); ref = Z["ref"]
    base = 1 / next(x["scale"] for x in Z["shots"] if x["i"] == ref)      # 기준샷의 (넓은 샷 대비) 배율 역수
    step = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5
    kr, dr = kd[ref]; out = []
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-vf", f"fps={1/step},scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-"], stdout=subprocess.PIPE)
    k = 0
    while True:
        b = p.stdout.read(W * H)
        if len(b) < W * H: break
        f = np.frombuffer(b, np.uint8).reshape(H, W); kb, db = orb.detectAndCompute(f, mask)
        r = None
        if db is not None and len(kb) >= 30:
            m = sorted(bf.match(dr, db), key=lambda x: x.distance)[:400]
            if len(m) >= 30:
                pa = np.float32([kr[x.queryIdx].pt for x in m]); pb = np.float32([kb[x.trainIdx].pt for x in m])
                M, inl = cv2.estimateAffinePartial2D(pb, pa, method=cv2.RANSAC, ransacReprojThreshold=3)
                if M is not None and inl.sum() >= 25: r = (1 / float(np.hypot(M[0, 0], M[1, 0])), float(M[0, 2]), float(M[1, 2]))
        out.append(dict(t=round(k * step + step / 2, 2), scale=round(r[0] / base, 3) if r else None, dx=round(r[1] * 2, 1) if r else None, dy=round(r[2] * 2, 1) if r else None))
        k += 1
    json.dump(out, open(os.path.join(d, "zoom_dense.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    from collections import Counter
    print("dense", len(out), Counter(round(x["scale"], 2) for x in out if x["scale"]).most_common(10)); sys.exit()
# 기준: 가장 긴 샷부터 시도해 다른 샷이 가장 많이 맞는 것
ref = int(sys.argv[3]) if len(sys.argv) > 3 else None
if ref is None:
    order = sorted(range(len(shots)), key=lambda i: -shots[i]["dur"])[:5]
    best = max(order, key=lambda r: sum(1 for i in range(len(shots)) if rel(r, i)))
    ref = best
R = []
for i, s in enumerate(shots):
    r = rel(ref, i) if i != ref else (1.0, 0.0, 0.0, 999)
    R.append(dict(i=i, s=s["s"], e=s["e"], dur=s["dur"], ok=r is not None, scale=round(r[0], 3) if r else None,
                  dx=round(r[1] * 2, 1) if r else None, dy=round(r[2] * 2, 1) if r else None, inl=r[3] if r else 0))
# 가장 넓은 샷을 1.0으로 다시 맞춤
ok = [x["scale"] for x in R if x["ok"]]
base = min(ok) if ok else 1
for x in R:
    if x["ok"]: x["scale"] = round(x["scale"] / base, 3)
json.dump(dict(ref=ref, shots=R), open(os.path.join(d, "zoom.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
from collections import Counter
print("기준샷", ref, "맞음", len(ok), "/", len(R), "배율 분포", Counter(round(x["scale"], 2) for x in R if x["ok"]).most_common(8))
