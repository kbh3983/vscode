"""레퍼런스 분석 — 화면 자막을 프레임 단위로 추적 (2026-10-27 놀심)
  python captions.py <영상> <out 폴더(shots.json 있는 곳)> [W=384]
  → captions.json : [{s, e, f0, f1, box:[x0,y0,x1,y1](1920 기준), px, col:[r,g,b], dark_bg}] 자막 한 덩어리 = 화면 글자가 그대로인 구간
  → captions/ : 덩어리마다 가운데 프레임의 자막 부분 crop (원본 크기)
방법: 글자 픽셀 = 밝거나(흰) 채도 높은 밝은 색(노랑·연두·빨강)이면서 3px 안에 80 이상 어두운 픽셀(외곽선·박스·그림자·빛 번짐 가장자리)이 있는 곳.
샷(shots.json)마다 60% 이상 프레임에 계속 있는 픽셀(배경 모서리)은 빼고, 남은 마스크가 앞 프레임과 많이 달라지면 새 덩어리.
"""
import json, os, subprocess, sys
import numpy as np

src, d = sys.argv[1], sys.argv[2]
W = int(sys.argv[3]) if len(sys.argv) > 3 else 384
H = W * 9 // 16; S = 1920 / W
FF = "ffmpeg"
shots = json.load(open(os.path.join(d, "shots.json"), encoding="utf-8"))
fps = 30.0
try:
    num, den = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", src], capture_output=True, text=True).stdout.strip().split("/")
    fps = float(num) / float(den or 1)
except Exception:
    pass

def mask_of(a):
    """글자 픽셀: 흰색 또는 밝은 유채색이면서 3px 안에 자기보다 80 이상 어두운 픽셀(외곽선·그림자·박스·빛 번짐 가장자리)이 있는 곳"""
    a = a.astype(np.int16); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(2); mn = a.min(2); lum = (r * 3 + g * 6 + b) // 10
    white = mn > 215
    color = (mx > 170) & (mx - mn > 90)
    lo = lum.copy()
    for k in (1, 2, 3):
        lo[k:] = np.minimum(lo[k:], lum[:-k]); lo[:-k] = np.minimum(lo[:-k], lum[k:])
        lo[:, k:] = np.minimum(lo[:, k:], lum[:, :-k]); lo[:, :-k] = np.minimum(lo[:, :-k], lum[:, k:])
    m = (white | color) & (lum - lo > 80)
    return m, (r, g, b)

p = subprocess.Popen([FF, "-v", "error", "-i", src, "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
N = W * H * 3
masks, cols = [], []
while True:
    b = p.stdout.read(N)
    if len(b) < N: break
    a = np.frombuffer(b, np.uint8).reshape(H, W, 3)
    m, _ = mask_of(a)
    masks.append(np.packbits(m))
    cols.append(a[m].mean(0) if m.sum() else np.zeros(3))
p.wait()
n = len(masks)
unpack = lambda i: np.unpackbits(masks[i])[: H * W].reshape(H, W).astype(bool)

# 샷별 고정 픽셀
static = np.zeros(n, dtype=object)
for sh in shots:
    f0, f1 = sh["f0"], min(sh["f1"], n - 1)
    idx = list(range(f0, f1 + 1, max(1, (f1 - f0 + 1) // 60)))
    acc = np.zeros((H, W), np.float32)
    for i in idx: acc += unpack(i)
    st = acc / max(1, len(idx)) > 0.6
    for i in range(f0, f1 + 1): static[i] = st
for i in range(n):
    if not isinstance(static[i], np.ndarray): static[i] = np.zeros((H, W), bool)

segs = []; cur = None; prev = None
MINPX = 12
for i in range(n):
    m = unpack(i) & ~static[i]
    # 작은 잡티 제거: 행/열 합 기준으로 글자 줄만 남김
    rows = m.sum(1) >= 2; m &= rows[:, None]
    px = int(m.sum())
    if prev is not None:
        inter = (m & prev).sum(); uni = (m | prev).sum()
        iou = inter / uni if uni else 1.0
    else:
        iou = 0.0
    on = px >= MINPX
    if cur is not None and (not on or iou < 0.55):
        cur["f1"] = i - 1; segs.append(cur); cur = None
    if on and cur is None:
        cur = dict(f0=i, acc=np.zeros((H, W), np.int32), cnt=0)
    if cur is not None:
        cur["acc"] += m; cur["cnt"] += 1
    prev = m
if cur is not None: cur["f1"] = n - 1; segs.append(cur)

out = []
for sg in segs:
    if sg["f1"] - sg["f0"] + 1 < 4: continue          # 4프레임 미만은 움직임 잡티
    core = sg["acc"] >= sg["cnt"] * 0.5
    if core.sum() < MINPX: continue
    ys, xs = np.nonzero(core)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    mid = (sg["f0"] + sg["f1"]) // 2
    out.append(dict(f0=sg["f0"], f1=sg["f1"], s=round(sg["f0"] / fps, 3), e=round((sg["f1"] + 1) / fps, 3),
                    box=[int(x0 * S), int(y0 * S), int((x1 + 1) * S), int((y1 + 1) * S)], px=int(core.sum()),
                    col=[int(c) for c in cols[mid]], mid=mid))

# 너무 붙은 같은 위치 덩어리 합치기는 하지 않음 (글자 바뀜 = 새 자막)
cd = os.path.join(d, "captions"); os.makedirs(cd, exist_ok=True)
for k, c in enumerate(out):
    x0, y0, x1, y1 = c["box"]; pad = 24
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad); x1, y1 = min(1920, x1 + pad), min(1080, y1 + pad)
    t = c["mid"] / fps
    fn = os.path.join(cd, f"c{k:03d}_{c['s']:07.2f}.jpg")
    subprocess.run([FF, "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1", "-vf", f"crop={x1-x0}:{y1-y0}:{x0}:{y0}", "-q:v", "3", fn])
    c["img"] = os.path.basename(fn)
json.dump(out, open(os.path.join(d, "captions.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print("자막 덩어리", len(out), "프레임", n)
