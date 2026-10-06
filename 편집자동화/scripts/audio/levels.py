"""오디오 에이전트 A3 — 말소리 문장별 최고 음량 측정.

입력: work/<p>/audio/tracks.json  (시퀀스 오디오 트랙 클립 목록, 에이전트가 Premiere에서 읽어 씀)
      [{"track": "A1", "path": "...", "start": 0.0, "in": 0.0, "end": 332.83, "gain_db": 0.0}, ...]
      work/<p>/subtitle/subtitle.json 의 cues_final (문장 구간, 시퀀스 시간)
출력: work/<p>/audio/levels.json, 콘솔 요약

측정: 모든 트랙을 합친 믹스(Premiere 오디오 미터와 같은 기준)에서
      문장 구간마다 상위 1% 큰 샘플을 뺀 최고값(dBFS). criteria.md 참고.
실행: .venv/Scripts/python scripts/audio/levels.py work/<p>
"""
import json
import os
import subprocess
import sys

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")

SR = 48000
TOP_EXCLUDE = 0.01      # 상위 1% 제외
TARGET = -5.0           # 말소리 겨냥값
RANGE = (-6.0, -4.0)
SPREAD_KEYFRAME = 3.0   # 문장 간 차이가 이보다 크면 키프레임


def load(path, start, dur):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(dur), "-i", path, "-vn",
                          "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2)


def mix(tracks, length):
    out = np.zeros((int(length * SR), 2), np.float32)
    for t in tracks:
        a = load(t["path"], t["in"], t["end"] - t["start"])
        if t.get("fill") in ("L", "R"):   # Premiere '좌측과 우측 채우기' 등: 한 채널을 양쪽으로
            c = 0 if t["fill"] == "L" else 1
            a = np.repeat(a[:, c:c + 1], 2, axis=1)
        s = int(t["start"] * SR)
        n = min(len(a), int(t["end"] * SR) - s, len(out) - s)
        out[s:s + n] += a[:n] * 10 ** (t.get("gain_db", 0.0) / 20)
    return out


def peak_db(x):
    if len(x) == 0:
        return None
    v = np.quantile(np.abs(x).max(axis=1), 1 - TOP_EXCLUDE)
    return round(float(20 * np.log10(max(v, 1e-9))), 2)


def speech_segments(m, frame=0.05, gap=0.4):
    """자막이 없을 때: 믹스 에너지로 말 구간을 찾는다 (바닥 소음 + 20 dB 이상, 0.4초 미만 쉼은 이어 붙임)."""
    n = int(frame * SR)
    k = len(m) // n
    rms = np.sqrt((m[:k * n].reshape(k, n, 2) ** 2).mean(axis=(1, 2)))
    db = 20 * np.log10(rms + 1e-9)
    on = db > np.percentile(db, 10) + 20
    segs, cur = [], None
    for i, v in enumerate(on):
        if v:
            if cur and i * frame - cur[1] <= gap:
                cur[1] = (i + 1) * frame
            else:
                if cur:
                    segs.append(cur)
                cur = [i * frame, (i + 1) * frame]
    if cur:
        segs.append(cur)
    return [{"start": round(a, 2), "end": round(b, 2), "text": ""} for a, b in segs]


def main(work):
    out = os.path.join(work, "audio")
    tracks = json.load(open(os.path.join(out, "tracks.json"), encoding="utf-8"))
    length = max(t["end"] for t in tracks)
    m = mix(tracks, length)
    sub = os.path.join(work, "subtitle", "subtitle.json")
    if os.path.exists(sub):
        cues = json.load(open(sub, encoding="utf-8"))["cues_final"]
    else:
        cues = speech_segments(m)
        print(f"자막 없음 → 에너지로 찾은 말 구간 {len(cues)}개")
    rows = []
    for i, c in enumerate(cues, 1):
        if c["end"] - c["start"] < 0.3:   # 짧은 추임새는 측정값이 불안정
            continue
        seg = m[int(c["start"] * SR):int(c["end"] * SR)]
        rows.append({"cue": i, "start": c["start"], "end": c["end"], "text": c["text"], "peak_db": peak_db(seg)})
    peaks = np.array([r["peak_db"] for r in rows])
    med = float(np.median(peaks))
    result = {
        "tracks": tracks,
        "whole_peak_db": peak_db(m),
        "true_peak_db": round(float(20 * np.log10(np.abs(m).max() + 1e-9)), 2),
        "sentence_median_db": round(med, 2),
        "sentence_p10_db": round(float(np.percentile(peaks, 10)), 2),
        "sentence_p90_db": round(float(np.percentile(peaks, 90)), 2),
        "gain_to_target_db": round(TARGET - med, 2),
        "needs_keyframes": bool(np.percentile(peaks, 90) - np.percentile(peaks, 10) > SPREAD_KEYFRAME),
        "sentences": rows,
    }
    json.dump(result, open(os.path.join(out, "levels.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"믹스 전체 피크(상위1%제외) {result['whole_peak_db']} dB, 실제 최고 {result['true_peak_db']} dB")
    print(f"문장 피크 중앙값 {med:.2f} dB (10%~90%: {result['sentence_p10_db']} ~ {result['sentence_p90_db']})")
    print(f"겨냥값 {TARGET} dB 까지 {result['gain_to_target_db']:+.2f} dB, 키프레임 필요: {result['needs_keyframes']}")
    for r in sorted(rows, key=lambda r: r["peak_db"])[:5]:
        print(f"  작은 문장 {r['cue']:3} {r['peak_db']:6.2f} dB  {r['text']}")
    for r in sorted(rows, key=lambda r: -r["peak_db"])[:5]:
        print(f"  큰 문장   {r['cue']:3} {r['peak_db']:6.2f} dB  {r['text']}")


if __name__ == "__main__":
    main(sys.argv[1])
