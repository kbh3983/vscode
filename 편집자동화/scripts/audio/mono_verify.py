"""오디오 에이전트 — 모노 사운드 검증 (agents/오디오/playbook_모노.md 4-5).

입력: work/모노/<시퀀스>.json (원본 클립 목록), <시퀀스>_plan.json, Premiere에서 내보낸 결과 WAV
확인: 좌·우 RMS, 두 사람(왼쪽/오른쪽 마이크 주인) 구간 미터 최고값, −4~−6 dB 안 비율, −6 dB 넘는 곳
실행: .venv/Scripts/python scripts/audio/mono_verify.py work/모노/<시퀀스>.json <결과.wav>
"""
import json
import sys

import numpy as np

sys.path.insert(0, __file__.rsplit("\\", 1)[0] if "\\" in __file__ else __file__.rsplit("/", 1)[0])
import levels as L  # noqa: E402
from mono import frames  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")


def main(path, wav):
    d = json.load(open(path, encoding="utf-8"))
    plan = json.load(open(path.replace(".json", "_plan.json"), encoding="utf-8"))
    clips = [c for c in d["tracks"][plan["track"] - 1] if c["path"] in plan["sources"] and not c["disabled"]]
    end = max(c["end"] for c in clips)
    raw = L.mix([{"track": "", **c} for c in clips], end)
    x = L.load(wav, 0, end)
    n = min(len(x), len(raw))
    x, raw = x[:n], raw[:n]
    SR = L.SR
    rms = lambda v: 20 * np.log10(np.sqrt((v ** 2).mean()) + 1e-9)
    _, _, sp, dd = frames(raw)
    rows = {"왼쪽": [], "오른쪽": [], "?": []}
    for s in L.speech_segments(raw):
        if s["end"] - s["start"] < 0.3:
            continue
        a, b = int(s["start"] / 0.05), int(s["end"] / 0.05)
        w = sp[a:b]
        md = float(np.median(dd[a:b][w])) if w.sum() else 0.0
        who = "왼쪽" if md > 4 else ("오른쪽" if md < -4 else "?")
        seg = x[int(s["start"] * SR):int(s["end"] * SR)]
        rows[who].append((20 * np.log10(np.abs(seg).max() + 1e-9), L.peak_db(seg)))
    allv = np.array([r for v in rows.values() for r in v])
    over = sorted(set(int(i / SR) for i in np.where(np.abs(x).max(1) > 10 ** (-6 / 20) + 1e-4)[0]))
    print(f"{d['name']}_모노 (0~{end:.0f}초): 좌 RMS {rms(x[:, 0]):.2f} / 우 {rms(x[:, 1]):.2f} dB, 좌우 차이 최대 {np.abs(x[:, 0] - x[:, 1]).max():.4f}")
    for w in ("왼쪽", "오른쪽"):
        v = np.array(rows[w])
        if len(v):
            print(f"  {w} 마이크 주인 {len(v)}구간: 미터 최고값 중앙값 {np.median(v[:, 0]):.2f}, 상위1% 제외 {np.median(v[:, 1]):.2f} dB")
    inr = ((allv[:, 0] >= -6.05) & (allv[:, 0] <= -4)).sum()
    print(f"  말 구간 {len(allv)}개 중 −4~−6 dB {inr}개 ({inr / len(allv) * 100:.0f}%), −6 dB 넘는 곳 {len(over)}초: {over[:15]}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
