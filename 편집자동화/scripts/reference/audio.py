"""레퍼런스 분석 — 목소리/음악 줄기(stems)에서 배경음악 구간·음량, 효과음 후보
  python audio.py <분석 폴더>   → <폴더>/audio.json, audio.png(시간축 그래프)
- 0.1초 창 RMS(dBFS): vocals, music(=목소리 뺀 나머지)
- 배경음악 구간: music이 −50dB 넘는 상태가 2초 이상 이어짐 (짧은 끊김 1.5초는 메움)
- 음악 대비 목소리: 둘 다 있는 창에서 vocals − music 중앙값 (dB)
- 효과음 후보: music 줄기에서 0.1초 창 에너지가 앞 1초 중앙값보다 +10dB 이상 튀고 0.05~1.5초 안에 가라앉는 것
"""
import json, os, sys
import numpy as np, soundfile as sf

d = sys.argv[1]
def rms_db(path, win=0.1):
    a, sr = sf.read(path, dtype="float32", always_2d=True); a = a.mean(1)
    n = int(sr * win); k = len(a) // n
    r = np.sqrt((a[:k * n].reshape(k, n) ** 2).mean(1) + 1e-12)
    return 20 * np.log10(r + 1e-9)
V = rms_db(os.path.join(d, "stems", "vocals.wav")); M = rms_db(os.path.join(d, "stems", "music.wav"))
n = min(len(V), len(M)); V, M = V[:n], M[:n]; t = np.arange(n) * 0.1
on = M > -50
# 짧은 끊김 메우기
i = 0
while i < n:
    if not on[i]:
        j = i
        while j < n and not on[j]: j += 1
        if 0 < i and j < n and (j - i) <= 15: on[i:j] = True
        i = j
    else: i += 1
segs = []; i = 0
while i < n:
    if on[i]:
        j = i
        while j < n and on[j]: j += 1
        if j - i >= 20: segs.append(dict(s=round(i * 0.1, 1), e=round(j * 0.1, 1), dur=round((j - i) * 0.1, 1), music_db=round(float(np.median(M[i:j])), 1),
                                      voice_db=round(float(np.median(V[i:j][V[i:j] > -45])) if (V[i:j] > -45).any() else -99, 1)))
        i = j
    else: i += 1
both = (V > -40) & (M > -55)
sfx = []
for i in range(10, n - 15):
    base = np.median(M[i - 10:i])
    if M[i] - base > 10 and M[i] > -40:
        k = i
        while k < n and M[k] > base + 6: k += 1
        if 1 <= k - i <= 15 and (not sfx or t[i] - sfx[-1]["t"] > 0.5):
            sfx.append(dict(t=round(float(t[i]), 1), peak_db=round(float(M[i:k].max()), 1), dur=round((k - i) * 0.1, 1), jump=round(float(M[i] - base), 1)))
R = dict(total=round(n * 0.1, 1), music_segments=segs, music_cover=round(sum(s["dur"] for s in segs) / (n * 0.1), 3),
         voice_minus_music_db=round(float(np.median(V[both] - M[both])), 1) if both.any() else None,
         voice_median_db=round(float(np.median(V[V > -45])), 1), music_median_db=round(float(np.median(M[on])), 1) if on.any() else None, sfx=sfx)
json.dump(R, open(os.path.join(d, "audio.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
try:
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(24, 4)); ax.plot(t, V, lw=0.3, label="voice"); ax.plot(t, M, lw=0.3, label="music/sfx"); ax.set_ylim(-80, 0)
    for s in sfx: ax.axvline(s["t"], color="r", lw=0.3)
    ax.legend(); fig.savefig(os.path.join(d, "audio.png"), dpi=80, bbox_inches="tight")
except Exception as e: print("그래프 생략", e)
print("음악 구간", len(segs), "덮는 비율 %.0f%%" % (100 * R["music_cover"]), "목소리−음악 %s dB" % R["voice_minus_music_db"], "효과음 후보", len(sfx))
