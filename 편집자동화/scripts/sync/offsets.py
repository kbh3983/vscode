"""S3/S4/S7: 오디오 파형 비교로 클립 간 오프셋 계산.

사용법:
    python offsets.py <probe.json> <출력.json> [cameras.json]

cameras.json (선택): {"<파일경로>": "A", ...}
  - 있으면 서로 다른 카메라끼리만 비교
  - 없으면 모든 클립 쌍을 비교

결과의 b_start_in_a(초): 클립 A 기준으로 클립 B의 0초가 놓이는 위치.
  예) 2.5 → B는 A보다 2.5초 늦게 시작. 음수면 B가 먼저 시작.
"""
import itertools
import json
import subprocess
import sys

import numpy as np

COARSE_SR = 2000      # 대략 위치 찾기용
FINE_SR = 16000       # 정밀 계산용
FINE_SEARCH = 0.15    # 정밀 계산 시 대략 위치 주변 ±초
WINDOW = 20.0         # 정밀 계산 구간 길이(초). 겹치는 구간 전체를 이 간격으로 나눠 계산
EXCLUDE = 0.5         # 두 번째 피크를 찾을 때 제외할 주변 ±초


def load_audio(path, sr, start=None, dur=None):
    cmd = ["ffmpeg", "-v", "error"]
    if start is not None:
        cmd += ["-ss", f"{max(start, 0):.4f}"]
    cmd += ["-i", path]
    if dur is not None:
        cmd += ["-t", f"{dur:.4f}"]
    cmd += ["-vn", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    x -= x.mean() if len(x) else 0
    return x


def xcorr(a, b, phat=False):
    """corr[lag] = sum a[n+lag] * b[n]. lag 범위 -(len(b)-1) .. len(a)-1.

    phat=True: 주파수 크기를 정규화(GCC-PHAT)해 음성처럼 비슷한 파형이 반복되는
    신호에서도 정답 위치가 뾰족하게 드러나게 한다.
    """
    n = 1 << int(np.ceil(np.log2(len(a) + len(b))))
    spec = np.fft.rfft(a, n) * np.conj(np.fft.rfft(b, n))
    if phat:
        spec /= np.abs(spec) + 1e-12
    c = np.fft.irfft(spec, n)
    c = np.concatenate([c[n - len(b) + 1:], c[:len(a)]])
    lags = np.arange(-(len(b) - 1), len(a))
    return lags, c


def peak_info(lags, c, sr):
    i = int(np.argmax(c))
    peak = c[i]
    mask = np.abs(lags - lags[i]) > EXCLUDE * sr
    second = c[mask].max() if mask.any() else 0.0
    ratio = peak / second if second > 0 else float("inf")
    confidence = 1 - 1 / ratio if ratio > 1 else 0.0
    return lags[i] / sr, float(ratio), float(confidence)


def window_lag(a, b, b_start_in_a, a_t):
    """A의 a_t초부터 WINDOW 구간에서, 대략 위치 주변 ±FINE_SEARCH 안의 정밀 오프셋.

    음성 대역(100~4000Hz)만 쓰고 PHAT-β(0.7) 가중을 한다.
    seek 오차를 피하려고 전체를 한 번 디코딩한 배열을 잘라 쓴다.
    """
    sr = FINE_SR
    b_t = a_t - b_start_in_a
    xa = a[int((a_t - FINE_SEARCH) * sr): int((a_t + WINDOW + FINE_SEARCH) * sr)]
    xb = b[int(b_t * sr): int((b_t + WINDOW) * sr)]
    if a_t - FINE_SEARCH < 0 or b_t < 0 or len(xb) < WINDOW * sr * 0.9:
        return None
    n = 1 << int(np.ceil(np.log2(len(xa) + len(xb))))
    spec = np.fft.rfft(xa, n) * np.conj(np.fft.rfft(xb, n))
    f = np.fft.rfftfreq(n, 1 / sr)
    spec[(f < 100) | (f > 4000)] = 0
    spec /= np.abs(spec) ** 0.7 + 1e-12
    c = np.fft.irfft(spec, n)[: int(2 * FINE_SEARCH * sr) + 1]   # lag 0 .. 2*SEARCH
    return b_start_in_a + int(np.argmax(c)) / sr - FINE_SEARCH


def compare(a, b, tolerance_frames=1.0):
    a_audio = load_audio(a["path"], COARSE_SR)
    b_audio = load_audio(b["path"], COARSE_SR)
    coarse, ratio, confidence = peak_info(*xcorr(a_audio, b_audio, phat=True), COARSE_SR)

    # 겹치는 구간 (A 기준 시간)
    ov_start = max(0.0, coarse)
    ov_end = min(a["duration"], coarse + b["duration"])
    overlap = ov_end - ov_start
    result = {
        "a": a["path"], "b": b["path"],
        "b_start_in_a_coarse": coarse,
        "peak_ratio": ratio, "confidence": confidence,
        "overlap_sec": overlap,
    }
    if overlap < 5:
        result["status"] = "failed"
        return result

    # 겹치는 구간 전체에서 WINDOW 간격으로 정밀 계산 → 중앙값 = 최종 오프셋
    fa = load_audio(a["path"], FINE_SR)
    fb = load_audio(b["path"], FINE_SR)
    times = np.arange(ov_start + FINE_SEARCH, ov_end - WINDOW - FINE_SEARCH, WINDOW)
    lags = [(t, window_lag(fa, fb, coarse, t)) for t in times]
    lags = [(t, v) for t, v in lags if v is not None]
    fps = a["video"]["fps"] if a.get("video") else 30.0
    if not lags:
        offset = coarse
        drift = None
        spread = None
    else:
        ts, vs = np.array(lags).T
        offset = float(np.median(vs))
        spread = float((np.percentile(vs, 75) - np.percentile(vs, 25)) * fps)
        # 드리프트: 구간별 오프셋의 추세(기울기)로 시작→끝 변화량 추정
        slope = np.polyfit(ts, vs, 1)[0] if len(ts) >= 3 else 0.0
        drift = float(slope * (ts[-1] - ts[0]) * fps)

    frames = round(offset * fps)
    status = "ok"
    if confidence < 0.8 or (spread is not None and spread > tolerance_frames):
        status = "review"
    result.update({
        "b_start_in_a": offset,
        "b_start_in_a_frames": frames,
        "fps": fps,
        "windows": len(lags),
        "spread_frames_iqr": spread,
        "drift_frames_start_to_end": drift,
        "drift_warning": drift is not None and abs(drift) > tolerance_frames,
        "status": status,
    })
    return result


def main():
    probe_path, out_path = sys.argv[1], sys.argv[2]
    cameras = {}
    if len(sys.argv) > 3:
        with open(sys.argv[3], encoding="utf-8") as f:
            cameras = json.load(f)
    with open(probe_path, encoding="utf-8") as f:
        clips = [c for c in json.load(f) if c.get("audio")]

    results = []
    for a, b in itertools.combinations(clips, 2):
        if cameras and cameras.get(a["path"]) == cameras.get(b["path"]):
            continue
        r = compare(a, b)
        results.append(r)
        print(json.dumps(r, ensure_ascii=False, indent=2))

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
