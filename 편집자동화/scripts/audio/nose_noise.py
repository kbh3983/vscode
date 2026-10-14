"""오디오 에이전트 — 콧바람 노이즈 후보 찾기 (2026-10-14 승인: 처음엔 후보 → 사용자 승인, 데이터가 쌓이면 자동화)

  python nose_noise.py <원본 오디오.wav> <out.json> [시작초 끝초]
  (wav: ffmpeg -i <영상> -vn -ac 2 -ar 24000 -c:a pcm_s16le <wav>)

- 두 출연자 핀마이크가 L·R에 따로 녹음된 영상. 한쪽 마이크에만 6dB 이상 크게 들어간 소리(-50dBFS 넘음, 60ms 이상) 중
  **저음(300Hz 아래) 비율 0.8 이상 + 중심 주파수 250Hz 아래** = 코로 세게 내쉰 바람이 핀마이크에 닿는 소리
  (하체루틴 회고: 사용자가 끈 14클립 중 12~13개에서 잡힘, 그대로 둔 곳 11개도 잡힘 → 사용자 확인 필요)
- 1초 안에 붙은 후보는 한 구간으로 묶음. 결과: 원본 시간·채널·길이·최고 크기
- 처리(사용자 승인 뒤): 그 구간만 잘라 반대 채널로 채우기 — 프리미어 "좌측과 우측 채우기"(R을 끔) / "우측과 좌측 채우기"(L을 끔)
"""
import json, sys
import numpy as np
from scipy.io import wavfile

LOW_MIN, CEN_MAX, GAP = 0.8, 250, 1.0

def main(wav, out, a=None, b=None):
    sr, x = wavfile.read(wav); x = x.astype(np.float32) / 32768
    a = float(a) if a else 0.0; b = float(b) if b else len(x) / sr
    H = int(sr * 0.02); seg = x[int(a * sr):int(b * sr)]; n = len(seg) // H
    fr = seg[:n * H].reshape(n, H, 2); lv = 10 * np.log10((fr ** 2).mean(1) + 1e-12)   # (n, 2)
    found = []
    for ch in (0, 1):
        on = (lv[:, ch] > -50) & (lv[:, ch] - lv[:, 1 - ch] > 6); i = 0
        while i < n:
            if not on[i]: i += 1; continue
            j = i
            while j < n and on[j]: j += 1
            if j - i >= 3:
                s = fr[i:j, :, ch].ravel(); S = np.abs(np.fft.rfft(s * np.hanning(len(s)))) ** 2 + 1e-12; f = np.fft.rfftfreq(len(s), 1 / sr)
                low = S[f < 300].sum() / S.sum(); cen = (S * f).sum() / S.sum()
                if low >= LOW_MIN and cen < CEN_MAX:
                    found.append(dict(ch="LR"[ch], t0=a + i * 0.02, t1=a + j * 0.02, peak=float(lv[i:j, ch].max()), low=float(low), cen=float(cen)))
            i = j
    found.sort(key=lambda r: (r["ch"], r["t0"])); G = []
    for r in found:
        if G and G[-1]["ch"] == r["ch"] and r["t0"] - G[-1]["t1"] < GAP:
            G[-1]["t1"] = r["t1"]; G[-1]["peak"] = max(G[-1]["peak"], r["peak"]); G[-1]["n"] += 1
        else:
            G.append(dict(r, n=1))
    G.sort(key=lambda r: r["t0"])
    for g in G:
        for k in ("t0", "t1", "peak", "low", "cen"): g[k] = round(g[k], 2)
    json.dump(G, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for g in G: print("%d:%05.2f~%05.2f" % (g["t0"] // 60, g["t0"] % 60, g["t1"] % 60), g["ch"], "소리", g["n"], "최고 %.1fdB" % g["peak"])
    print(len(G), "후보")

if __name__ == "__main__":
    main(*sys.argv[1:])
