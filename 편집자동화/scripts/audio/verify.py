"""오디오 에이전트 A6 — Premiere에서 내보낸 결과(WAV)를 말 구간별로 다시 측정.

입력: work/<p>/audio/levels.json (말 구간), 내보낸 WAV (시퀀스 전체)
출력: levels.json 의 "verified", 콘솔 요약
실행: .venv/Scripts/python scripts/audio/verify.py work/<p> <export.wav>
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import levels as L  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")


def main(work, wav):
    p = os.path.join(work, "audio", "levels.json")
    lv = json.load(open(p, encoding="utf-8"))
    x = L.load(wav, 0, 1e6)
    rows = []
    for s in lv["sentences"]:
        s["peak_verified_db"] = L.peak_db(x[int(s["start"] * L.SR):int(s["end"] * L.SR)])
        if "skipped" not in s:
            rows.append(s)
    v = np.array([s["peak_verified_db"] for s in rows])
    inr = (v >= L.RANGE[0]) & (v <= L.RANGE[1])
    a = np.abs(x).max(axis=1)
    over = sorted(set(int(i / L.SR) for i in np.where(a > 10 ** (-1 / 20))[0]))
    clip = sorted(set(int(i / L.SR) for i in np.where(a >= 0.999)[0]))
    lv["verified"] = {
        "wav": wav,
        "sentence_median_db": round(float(np.median(v)), 2),
        "sentence_p10_db": round(float(np.percentile(v, 10)), 2),
        "sentence_p90_db": round(float(np.percentile(v, 90)), 2),
        "in_range": int(inr.sum()), "total": len(v),
        "true_peak_db": round(float(20 * np.log10(a.max() + 1e-9)), 2),
        "over_minus1_secs": over, "clipped_secs": clip,
        "out_of_range": [{"start": s["start"], "end": s["end"], "peak_db": s["peak_verified_db"]}
                         for s, ok in zip(rows, inr) if not ok],
    }
    json.dump(lv, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    r = lv["verified"]
    print(f"말소리 구간 피크 중앙값 {r['sentence_median_db']} dB (10~90%: {r['sentence_p10_db']} ~ {r['sentence_p90_db']})")
    print(f"범위 안 {r['in_range']}/{r['total']}, 실제 최고 {r['true_peak_db']} dB")
    print(f"-1 dB 넘는 초 {len(over)}개: {over[:40]}")
    print(f"0 dB 닿는 초 {len(clip)}개: {clip[:40]}")
    for o in r["out_of_range"][:20]:
        print(f"  범위 밖 {o['start']:8.2f}~{o['end']:8.2f}s  {o['peak_db']:6.2f} dB")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
