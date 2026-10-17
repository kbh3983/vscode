"""레퍼런스 분석 — 오디오 정밀 측정 (믹스·마감 방식 추정)
  python audio3.py <분석 폴더>   → <폴더>/audio3.json
- 원본(audio.wav): 통합 LUFS, 단기(3초) LUFS 분포 10/50/90%, 최대 true peak, 크레스트(피크−RMS, 압축 정도), 좌우 상관(모노/스테레오), 좌우 크기 차
- 목소리 줄기: 말하는 창(0.4초)의 크기 분포 10/50/90% (말소리가 얼마나 고르게 눌렸나 = 컴프레션), 저음(<120Hz)·고음(>6kHz) 비율 (EQ 추정)
- 음악 줄기: 분 단위로 "음악 있음" 표시 줄(■/·), 음악이 나올 때 목소리 대비 크기, 음악이 시작·끝나는 시각 목록 (페이드 길이 추정)
- 무음: 0.3초 넘는 완전 무음(−60dB 아래) 구간 수 (말 사이를 남기는지)
"""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf

d = sys.argv[1]
def load(p): a, sr = sf.read(p, dtype="float32", always_2d=True); return a, sr
A, sr = load(os.path.join(d, "audio.wav"))
V, _ = load(os.path.join(d, "stems", "vocals.wav")); M, _ = load(os.path.join(d, "stems", "music.wav"))
mono = A.mean(1); v = V.mean(1); m = M.mean(1)
def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
def frames(x, w):
    n = int(sr * w); k = len(x) // n; return x[:k * n].reshape(k, n)
R = {}
# 좌우
if A.shape[1] == 2:
    L, Rr = A[:, 0], A[:, 1]; act = np.abs(mono) > 1e-3
    R["stereo_corr"] = round(float(np.corrcoef(L[act][::50], Rr[act][::50])[0, 1]), 3) if act.sum() > 1000 else None
    R["lr_diff_db"] = round(float(db(L) - db(Rr)), 2)
# 크레스트 (1초 창마다 피크−RMS 중앙값)
F = frames(mono, 1.0); rms = np.sqrt((F ** 2).mean(1)) + 1e-9; pk = np.abs(F).max(1) + 1e-9
on = 20 * np.log10(rms) > -45
R["crest_db_median"] = round(float(np.median(20 * np.log10(pk[on] / rms[on]))), 1)
# 단기 LUFS (ffmpeg ebur128 3초)
out = subprocess.run(["ffmpeg", "-nostats", "-i", os.path.join(d, "audio.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="ignore").stderr
S = [float(x) for x in re.findall(r"S:\s*(-?[\d.]+)", out) if float(x) > -70]
if S: R["short_lufs_p10_50_90"] = [round(float(np.percentile(S, q)), 1) for q in (10, 50, 90)]
summ = out[out.rfind("Summary"):]
I = re.search(r"I:\s+(-?[\d.]+) LUFS", summ); P = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summ); LRA = re.search(r"LRA:\s+([\d.]+) LU", summ)
R["lufs"] = float(I.group(1)) if I else None; R["true_peak"] = float(P.group(1)) if P else None; R["lra"] = float(LRA.group(1)) if LRA else None
# 목소리 크기 분포 (0.4초 창, 말하는 창만)
Fv = frames(v, 0.4); vd = 20 * np.log10(np.sqrt((Fv ** 2).mean(1)) + 1e-9); sp = vd > -45
R["voice_db_p10_50_90"] = [round(float(np.percentile(vd[sp], q)), 1) for q in (10, 50, 90)]
R["voice_spread_db"] = round(R["voice_db_p10_50_90"][2] - R["voice_db_p10_50_90"][0], 1)
# 목소리 EQ (말하는 창 스펙트럼 평균)
idx = np.where(sp)[0][:: max(1, sp.sum() // 400)]
spec = np.zeros(int(sr * 0.4) // 2 + 1)
for i in idx: spec += np.abs(np.fft.rfft(Fv[i] * np.hanning(Fv.shape[1]))) ** 2
f = np.fft.rfftfreq(Fv.shape[1], 1 / sr); tot = spec[(f > 60) & (f < 12000)].sum()
R["voice_low_lt120_pct"] = round(100 * float(spec[(f > 60) & (f < 120)].sum() / tot), 2)
R["voice_high_gt6k_pct"] = round(100 * float(spec[(f > 6000) & (f < 12000)].sum() / tot), 2)
# 음악: 0.5초 창, −50dB 넘으면 있음
Fm = frames(m, 0.5); md = 20 * np.log10(np.sqrt((Fm ** 2).mean(1)) + 1e-9); mon = md > -50
# 짧은 끊김 메우기 (2초)
x = mon.copy(); i = 0; n = len(x)
while i < n:
    if not x[i]:
        j = i
        while j < n and not x[j]: j += 1
        if 0 < i and j < n and (j - i) <= 4: x[i:j] = True
        i = j
    else: i += 1
segs = []; i = 0
while i < n:
    if x[i]:
        j = i
        while j < n and x[j]: j += 1
        if j - i >= 4:
            seg = md[i:j]; pkI = int(np.argmax(seg)); top = seg.max()
            fi = next((k for k in range(len(seg)) if seg[k] > top - 6), 0) * 0.5   # 시작에서 최고−6dB까지 걸린 시간 = 페이드 인
            fo = (len(seg) - 1 - max(k for k in range(len(seg)) if seg[k] > top - 6)) * 0.5
            vv = 20 * np.log10(np.sqrt((v[int(i * 0.5 * sr):int(j * 0.5 * sr)] ** 2).mean()) + 1e-9)
            segs.append(dict(s=round(i * 0.5, 1), e=round(j * 0.5, 1), music_db=round(float(np.median(seg)), 1), voice_minus_music=round(float(vv - np.median(seg)), 1), fade_in=float(fi), fade_out=float(fo)))
        i = j
    else: i += 1
R["music_segments"] = segs
mins = int(np.ceil(len(x) * 0.5 / 60)); bar = ""
for k in range(mins):
    c = x[k * 120:(k + 1) * 120]; bar += "■" if c.mean() > 0.5 else ("▪" if c.mean() > 0.1 else "·")
R["music_bar_per_min"] = bar
# 완전 무음
Fs = frames(mono, 0.1); sd = 20 * np.log10(np.sqrt((Fs ** 2).mean(1)) + 1e-9); q = sd < -60
cnt = 0; i = 0
while i < len(q):
    if q[i]:
        j = i
        while j < len(q) and q[j]: j += 1
        if j - i >= 3: cnt += 1
        i = j
    else: i += 1
R["silences_over_0_3s"] = cnt
json.dump(R, open(os.path.join(d, "audio3.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0, default=float)
print({k: R[k] for k in R if k != "music_segments"}, "음악 구간", len(segs))
