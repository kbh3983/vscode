"""하체루틴 오디오 회고 9번 — 사용자가 채널을 끈 구간(콧바람 노이즈) vs 그대로 둔 구간의 '한쪽 마이크에만 있는 소리' 비교
한쪽 채널이 다른 쪽보다 6dB 이상 크고 -50dBFS 넘는 20ms 프레임을 묶어 사건으로 → 길이·크기·저음 비율·중심 주파수·평탄도
"""
import json, sys
import numpy as np
from scipy.io import wavfile

sr, x = wavfile.read(sys.argv[1]); x = x.astype(np.float32) / 32768
clips = json.load(open(sys.argv[2], encoding="utf-8"))
H = int(sr * 0.02)

def feats(seg):
    w = seg * np.hanning(len(seg)); S = np.abs(np.fft.rfft(w)) ** 2 + 1e-12; f = np.fft.rfftfreq(len(seg), 1 / sr)
    tot = S.sum(); low = S[f < 300].sum() / tot; cen = (S * f).sum() / tot
    flat = np.exp(np.mean(np.log(S[(f > 100) & (f < 8000)]))) / np.mean(S[(f > 100) & (f < 8000)])
    return low, cen, flat

def events(a, b, ch, label, src):
    sa, sb = x[int(a * sr):int(b * sr), ch], x[int(a * sr):int(b * sr), 1 - ch]
    n = len(sa) // H; E = []; cur = []
    for i in range(n):
        p = sa[i * H:(i + 1) * H]; q = sb[i * H:(i + 1) * H]
        lp = 10 * np.log10(np.mean(p ** 2) + 1e-12); lq = 10 * np.log10(np.mean(q ** 2) + 1e-12)
        if lp > -50 and lp - lq > 6: cur.append((i, lp))
        elif cur:
            E.append(cur); cur = []
    if cur: E.append(cur)
    out = []
    for e in E:
        if len(e) < 3: continue   # 60ms 미만은 무시
        i0, i1 = e[0][0], e[-1][0] + 1; seg = sa[i0 * H:i1 * H]
        low, cen, flat = feats(seg)
        out.append(dict(label=label, src=round(a + i0 * 0.02, 2), dur=round((i1 - i0) * 0.02, 2), peak=round(float(max(v for _, v in e)), 1),
                        low=round(float(low), 3), cen=int(cen), flat=round(float(flat), 3), ch="LR"[ch]))
    return out

R = []
for a, b, s, k, _ in clips["fill"]:
    ch = 1 if k == "좌" else 0     # 좌측과 우측 채우기 = 오른쪽(R)을 버림
    R += events(a, b, ch, "끈 채널", a)
for a, b, s, k, _ in clips["normal"]:
    if b - a < 1: continue
    for ch in (0, 1): R += events(a, b, ch, "둔 채널", a)
json.dump(R, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False)
import collections
for lab in ("끈 채널", "둔 채널"):
    E = [r for r in R if r["label"] == lab]
    if not E: continue
    arr = lambda k: np.array([r[k] for r in E])
    print(lab, len(E), "개 | 길이 중앙", np.median(arr("dur")), "| 크기 중앙", np.median(arr("peak")), "| 저음비 중앙", np.median(arr("low")),
          "| 중심주파수 중앙", np.median(arr("cen")), "| 평탄도 중앙", np.median(arr("flat")))
