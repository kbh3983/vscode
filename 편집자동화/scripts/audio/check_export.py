"""오디오 에이전트 A6 — 내보낸 결과 WAV를 기준(-4~-6 dB)에 맞는지 판정하는 유일한 도구 (2026-10-21)

실행: .venv/bin/python scripts/audio/check_export.py <결과.wav> [이전 결과.wav]
판정 지표 = 말 구간마다 **구간 최댓값(미터 최고값)** — Premiere 미터에 보이는 값, mono_verify.py와 같음.
  "상위 1% 제외 최고값"(levels.peak_db)은 **리미터 전 원음으로 게인을 계산할 때만** 쓴다. 리미터(-6 dB)를 거친 결과에 쓰면
  위가 눌린 만큼 낮게 나와 "작다"로 잘못 판정한다 → 여기서는 참고로만 출력하고 판정에 쓰지 않는다.
  게인은 이 결과로 다시 계산하지 않는다 (리미터 후 소리). 게인 계산은 levels.py(트랙 원음 합)로만.
이전 결과를 주면 같은 지표로 같이 재서, 범위 안 비율이 30%p 넘게 다르면 경고 — 측정 방법·대상부터 다시 확인할 것.
왜: 2026-10-21 노년필수근육 재확인에서 즉석 코드로 상위 1% 제외 값을 재 "-8.05 dB, 범위 0%"로 잘못 보고 →
    불필요한 게인 변경(+4.50 → +7.55 dB). 기준 지표로는 원래 -6.00 dB, 100% 범위 안이었음 (agents/오디오/failures.md)
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import levels as L  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
LO, HI = -6.05, -4.0   # 기준 -4~-6 dB (리미터 -6 dB에 붙는 값 허용)


def measure(wav):
    x = L.load(wav, 0, 1e6)
    segs = [(s["start"], s["end"]) for s in L.speech_segments(x) if s["end"] - s["start"] >= 0.3]
    meter = np.array([20 * np.log10(np.abs(x[int(a * L.SR):int(b * L.SR)]).max() + 1e-9) for a, b in segs])
    p99 = np.array([L.peak_db(x[int(a * L.SR):int(b * L.SR)]) for a, b in segs])
    rms = lambda v: 20 * np.log10(np.sqrt((v ** 2).mean()) + 1e-9)
    inr = int(((meter >= LO) & (meter <= HI)).sum())
    over = sorted({int(i / L.SR) for i in np.where(np.abs(x).max(1) > 10 ** (-6 / 20) + 1e-4)[0]})
    return dict(n=len(meter), median=float(np.median(meter)), inr=inr, ratio=inr / max(len(meter), 1),
                p99=float(np.median(p99)), rmsL=rms(x[:, 0]), rmsR=rms(x[:, 1]), over=over,
                low=sorted(zip(meter, segs))[:5])


def show(name, m):
    print(f"{name}: 말 구간 {m['n']}개 | 판정(미터 최고값) 중앙값 {m['median']:.2f} dB, -4~-6 안 {m['inr']}/{m['n']} ({m['ratio']*100:.0f}%)"
          f" | 좌우 RMS {m['rmsL']:.2f}/{m['rmsR']:.2f} | -6 dB 넘는 초 {m['over'][:10]}")
    print(f"   (참고 — 판정에 쓰지 않음: 상위 1% 제외 중앙값 {m['p99']:.2f} dB)")
    print("   작은 쪽:", [(f"{int(a // 60)}:{a % 60:04.1f}", round(float(v), 1)) for v, (a, b) in m["low"]])


def main(wav, prev=None):
    m = measure(wav); show(os.path.basename(wav), m)
    print("판정:", "기준 안" if m["ratio"] >= 0.9 else "기준 밖 구간 있음 — 리포트")
    if prev:
        p = measure(prev); show(os.path.basename(prev), p)
        if abs(m["ratio"] - p["ratio"]) > 0.3:
            print("★경고: 이전 결과와 범위 안 비율이 30%p 넘게 다름 — 측정 방법·대상 시퀀스·내보내기 범위부터 다시 확인하고, 원인을 확인하기 전에는 결론·조치하지 말 것")


if __name__ == "__main__":
    main(*sys.argv[1:3])
