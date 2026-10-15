"""레퍼런스 분석 — 오디오 보충 측정
  python audio2.py <분석 폴더>  → audio2.json
- 분마다 음악 줄기(목소리 뺀 나머지) 중앙값 dB — 본론에 아주 작은 배경음악이 깔리는지
- 목소리 없는 순간(쉼)의 음악 줄기 dB
- 음악 줄기 음색: 음이 있는 소리(배경음악)인지 — 0.5초 창 스펙트럼 평탄도 (낮을수록 음악·톤)
- 원본 통합 음량(LUFS)·최대(true peak) — ffmpeg ebur128
"""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf

d = sys.argv[1]
def load(p):
    a, sr = sf.read(p, dtype="float32", always_2d=True); return a.mean(1), sr
M, sr = load(os.path.join(d, "stems", "music.wav")); V, _ = load(os.path.join(d, "stems", "vocals.wav"))
n = sr // 10; k = min(len(M), len(V)) // n
def db(a): return 20 * np.log10(np.sqrt((a[:k * n].reshape(k, n) ** 2).mean(1)) + 1e-9)
Md, Vd = db(M), db(V)
per_min = [round(float(np.median(Md[i * 600:(i + 1) * 600])), 1) for i in range(k // 600 + 1) if Md[i * 600:(i + 1) * 600].size]
q = Vd < -45
# 스펙트럼 평탄도 (0.5초 창, 음악 줄기가 −55dB 넘는 곳만)
flat = []
w = sr // 2
for i in range(0, len(M) - w, w):
    seg = M[i:i + w]
    if 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9) < -55: continue
    sp = np.abs(np.fft.rfft(seg * np.hanning(w)))[20:4000] + 1e-9
    flat.append(float(np.exp(np.log(sp).mean()) / sp.mean()))
out = subprocess.run(["ffmpeg", "-nostats", "-i", os.path.join(d, "audio.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="ignore").stderr
summ = out[out.rfind("Summary"):]
I = re.search(r"I:\s+(-?[\d.]+) LUFS", summ); L = re.search(r"LRA:\s+([\d.]+) LU", summ); P = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summ)
R = dict(music_db_per_min=per_min, music_db_when_silent=round(float(np.median(Md[q])), 1) if q.any() else None, silent_windows=int(q.sum()),
         music_flatness_median=round(float(np.median(flat)), 3) if flat else None, music_windows_over_55=len(flat),
         lufs=float(I.group(1)) if I else None, lra=float(L.group(1)) if L else None, true_peak=float(P.group(1)) if P else None)
json.dump(R, open(os.path.join(d, "audio2.json"), "w"), indent=0)
print(R)
