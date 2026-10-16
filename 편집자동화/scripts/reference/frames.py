"""레퍼런스 분석 — 모든 프레임(영상 fps 그대로)을 작게 읽어 프레임별 지표 저장 + 컷·전환 검출
  python frames.py <영상> <out 폴더>
  → frames.npz : 프레임마다 diff(앞 프레임과 차이), hist_d(색 히스토그램 거리), luma, sat, 위·아래 띠 밝기 등
  → cuts.json  : [{f, t, kind: cut|dissolve|fade|flash, len}]  (f = 프레임 번호, 0부터)
  → thumbs/    : 프레임마다 저장은 안 함 (용량) — 컷마다 첫·가운데·끝 프레임만 shots/ 에 원본 크기 jpg
검출:
  - 하드 컷: hist_d 가 주변(±7프레임) 중앙값보다 크게 튐 + diff 큼, 1프레임
  - 디졸브/페이드: 여러 프레임에 걸쳐 차이가 고르게 이어짐 (검은/흰 화면 경유는 fade/flash)
"""
import json, os, subprocess, sys
import numpy as np

W, H = 160, 90
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
N = W * H * 3
diff, hd, luma, sat, top, bot, cen, corr = [], [], [], [], [], [], [], []
prevs = None
prev = None; prevh = None
while True:
    b = p.stdout.read(N)
    if len(b) < N: break
    a = np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.float32)
    g = a.mean(2)
    mx, mn = a.max(2), a.min(2)
    h = np.concatenate([np.histogram(a[:, :, c], bins=16, range=(0, 256))[0] for c in range(3)]).astype(np.float32); h /= h.sum()
    diff.append(0.0 if prev is None else float(np.abs(g - prev).mean()))
    hd.append(0.0 if prevh is None else float(np.abs(h - prevh).sum()))
    luma.append(float(g.mean())); sat.append(float(((mx - mn) / (mx + 1e-3)).mean()))
    top.append(float(g[:12].mean())); bot.append(float(g[-12:].mean())); cen.append(float(g[30:60, 50:110].mean()))
    sm = g.reshape(H // 5, 5, W // 5, 5).mean((1, 3)); sm = sm - sm.mean(); sm = sm / (np.linalg.norm(sm) + 1e-6)
    corr.append(1.0 if prevs is None else float((sm * prevs).sum()))   # 구도 상관 (32×18) — 색이 비슷한 카메라 사이 컷도 잡음
    prev, prevh, prevs = g, h, sm
p.wait()
D = {k: np.array(v, np.float32) for k, v in dict(diff=diff, hd=hd, luma=luma, sat=sat, top=top, bot=bot, cen=cen, corr=corr).items()}
np.savez_compressed(os.path.join(out, "frames.npz"), **D)
n = len(diff)
num, den = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", src], capture_output=True, text=True).stdout.strip().split("/")
fps = float(num) / float(den or 1)   # 29.97 / 59.94 / 23.976 등 영상마다 다름
hdv = D["hd"]; dv = D["diff"]
# 하드 컷
cuts = []
for i in range(1, n):
    lo, hi = max(1, i - 7), min(n, i + 8)
    loc = np.median(np.concatenate([hdv[lo:i], hdv[i + 1:hi]])) if hi - lo > 2 else 0
    cv = D["corr"]; nb = np.concatenate([cv[max(1, i - 5):i], cv[i + 1:min(n, i + 6)]])
    by_corr = cv[i] < 0.8 and len(nb) and cv[i] < np.median(nb) - 0.2 and dv[i] > 6
    if (hdv[i] > 0.35 and hdv[i] > 4 * loc + 0.08 and dv[i] > 6) or by_corr:
        cuts.append(dict(f=i, t=round(i / fps, 3), kind="cut", len=1))
# 점진 전환 (디졸브·페이드): 4~45프레임 동안 hd가 꾸준히 0.04 이상이고 합이 큼, 하드 컷과 겹치지 않음
isc = set(c["f"] for c in cuts)
i = 1
while i < n:
    if hdv[i] > 0.035 and i not in isc:
        j = i
        while j < n and hdv[j] > 0.03 and j not in isc and j - i < 60: j += 1
        if 4 <= j - i <= 45 and hdv[i:j].sum() > 0.6 and dv[i:j].mean() > 1.0:
            ml = D["luma"][i:j].min(); mh = D["luma"][i:j].max()
            kind = "fade" if ml < 12 else ("flash" if mh > 235 else "dissolve")
            cuts.append(dict(f=i, t=round(i / fps, 3), kind=kind, len=j - i))
        i = j + 1
    else:
        i += 1
cuts.sort(key=lambda c: c["f"])
json.dump(dict(n=n, fps=fps, cuts=cuts), open(os.path.join(out, "cuts.json"), "w"), indent=0)
print("프레임", n, "컷", sum(c["kind"] == "cut" for c in cuts), "점진", sum(c["kind"] != "cut" for c in cuts))
