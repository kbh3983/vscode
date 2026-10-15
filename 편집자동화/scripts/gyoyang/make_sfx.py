"""교양 에이전트 — 임시 효과음 합성 (사용자 2026-10-15: "효과음은 임시로 넣자." — 채널 음원은 보류 21번)
  python make_sfx.py <out 폴더>  → impact.wav, ding.wav, swish.wav, pop.wav (48kHz 스테레오)
레퍼런스 측정 (통합분석 7-2): 임팩트 −15~−20dB 0.3~1.2초 중심 1.5~2kHz / 가벼운 띵·스윽 −33~−40dB 0.1~0.4초 중심 5~7kHz / 팝
음량은 프리미어에서 클립 볼륨으로 맞춘다 (여기서는 피크 −3dBFS로 정규화)
"""
import os, sys
import numpy as np, soundfile as sf

SR = 48000
rng = np.random.default_rng(7)
def t(d): return np.arange(int(SR * d)) / SR
def env(n, a, d):   # 빠른 상승 a초, 지수 감쇠 d초
    x = np.arange(n) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def bp(x, lo, hi):   # FFT 대역 통과
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X[(f < lo) | (f > hi)] = 0; return np.fft.irfft(X, len(x))
def norm(x, db=-3): return x / (np.abs(x).max() + 1e-9) * 10 ** (db / 20)
def st(x, w=0.0): return np.stack([x * (1 - w), x * (1 + w)], 1)

def impact():   # 휙 + 쿵: 상승 노이즈 스윕 0.25초 → 저음 쿵 + 중역 타격
    n1 = t(0.25); sweep = bp(rng.standard_normal(len(n1)), 800, 6000) * (n1 / n1[-1]) ** 2
    n2 = t(0.9); thump = np.sin(2 * np.pi * (90 * n2 - 25 * n2 ** 2)) * env(len(n2), 0.003, 0.18)
    hit = bp(rng.standard_normal(len(n2)), 1200, 2600) * env(len(n2), 0.002, 0.06)
    return norm(np.concatenate([sweep * 0.6, thump + hit * 0.8]))
def ding():     # 맑은 띵: 2.6kHz + 배음, 0.5초 감쇠
    x = t(0.6); s = np.sin(2 * np.pi * 2637 * x) + 0.4 * np.sin(2 * np.pi * 5274 * x) + 0.15 * np.sin(2 * np.pi * 7911 * x)
    return norm(s * env(len(x), 0.002, 0.14))
def swish():    # 스윽: 고역 노이즈가 위로 쓸고 감
    x = t(0.3); nz = rng.standard_normal(len(x)); out = np.zeros_like(nz)
    for k, (lo, hi) in enumerate([(3000, 6000), (4500, 8000), (6000, 11000)]):
        seg = slice(k * len(x) // 3, (k + 1) * len(x) // 3); out[seg] = bp(nz, lo, hi)[seg]
    return norm(out * np.sin(np.pi * x / x[-1]) ** 1.5)
def pop():      # 톡: 짧은 사인 하강
    x = t(0.12); return norm(np.sin(2 * np.pi * (900 * x - 2500 * x ** 2)) * env(len(x), 0.001, 0.03))

out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for name, fn, w in (("impact", impact, 0.05), ("ding", ding, 0.0), ("swish", swish, 0.1), ("pop", pop, 0.0)):
    sf.write(os.path.join(out, name + ".wav"), st(fn(), w), SR, subtype="PCM_16"); print(name)
