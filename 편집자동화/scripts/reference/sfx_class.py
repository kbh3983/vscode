"""레퍼런스 분석 — 효과음 후보(audio.json sfx)를 소리 성격으로 묶기 (배경음악이 계속 깔리는 브이로그용)
  python sfx_class.py <분석 폴더> [묶음 수=6]   → <폴더>/sfx_class.json
- 후보마다 music 줄기에서 시작~+길이(최소 0.3초) 구간을 잘라
  길이, 스펙트럼 중심(높낮이), 대역폭, 평탄도(잡음성), 시작 기울기(어택), 음 높이 뚜렷함(톤성)을 잼
- 앞 1초 대비 튀는 정도(jump)로 '배경음악 위에 얹힌 것' 확인
- KMeans로 묶고, 묶음마다 평균 성격·대표 시각(jump 큰 순) 저장 → 대표 시각은 sheet.py --times로 화면 확인
"""
import json, os, sys
import numpy as np, soundfile as sf

d = sys.argv[1]; K = int(sys.argv[2]) if len(sys.argv) > 2 else 6
A = json.load(open(os.path.join(d, "audio.json"), encoding="utf-8"))
M, sr = sf.read(os.path.join(d, "stems", "music.wav"), dtype="float32", always_2d=True); M = M.mean(1)
feats, rows = [], []
for s in A["sfx"]:
    a = int(s["t"] * sr); L = int(max(s["dur"], 0.3) * sr)
    seg = M[a:a + L]
    if len(seg) < 2048: continue
    w = np.hanning(len(seg)); sp = np.abs(np.fft.rfft(seg * w)) + 1e-9; f = np.fft.rfftfreq(len(seg), 1 / sr)
    cen = float((sp * f).sum() / sp.sum()); bw = float(np.sqrt((sp * (f - cen) ** 2).sum() / sp.sum()))
    band = sp[(f > 50) & (f < 8000)]; flat = float(np.exp(np.log(band).mean()) / band.mean())
    env = np.abs(seg[: int(0.05 * sr)]); att = float(env.max() / (np.abs(seg).max() + 1e-9))   # 첫 50ms 안에 최대치에 얼마나 가까운지
    ac = np.correlate(seg[:4096], seg[:4096], "full")[4095:]; ac /= ac[0] + 1e-9
    lo, hi = int(sr / 1000), int(sr / 80); ton = float(ac[lo:hi].max()) if hi < len(ac) else 0.0
    feats.append([s["dur"], np.log(cen), np.log(bw), flat, att, ton])
    rows.append(dict(t=s["t"], dur=s["dur"], jump=s["jump"], peak_db=s["peak_db"], centroid_hz=round(cen), flat=round(flat, 3), attack=round(att, 2), tonal=round(ton, 2)))
X = np.array(feats); Xs = (X - X.mean(0)) / (X.std(0) + 1e-9)
def kmeans(X, K, it=100, tries=10):   # sklearn 없이 (venv에 없음)
    best = None; rng = np.random.default_rng(0)
    for _ in range(tries):
        C = X[rng.choice(len(X), K, replace=False)]
        for _ in range(it):
            lab = ((X[:, None] - C[None]) ** 2).sum(2).argmin(1)
            C2 = np.array([X[lab == k].mean(0) if (lab == k).any() else C[k] for k in range(K)])
            if np.allclose(C, C2): break
            C = C2
        sse = ((X - C[lab]) ** 2).sum()
        if best is None or sse < best[0]: best = (sse, lab)
    return best[1]
lab = kmeans(Xs, K) if len(X) >= K else np.zeros(len(X), int)
groups = []
for k in range(K):
    idx = [i for i in range(len(rows)) if lab[i] == k]
    if not idx: continue
    R = [rows[i] for i in idx]
    groups.append(dict(group=k, n=len(idx), dur=round(float(np.median([r["dur"] for r in R])), 2),
                       centroid_hz=int(np.median([r["centroid_hz"] for r in R])), flat=round(float(np.median([r["flat"] for r in R])), 3),
                       attack=round(float(np.median([r["attack"] for r in R])), 2), tonal=round(float(np.median([r["tonal"] for r in R])), 2),
                       examples=[r["t"] for r in sorted(R, key=lambda r: -r["jump"])[:8]]))
for i, r in enumerate(rows): r["group"] = int(lab[i])
tot = A["total"] / 60
json.dump(dict(per_min=round(len(rows) / tot, 1), groups=groups, sfx=rows), open(os.path.join(d, "sfx_class.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print("후보", len(rows), "분당 %.1f" % (len(rows) / tot))
for g in groups: print(g)
