"""오디오 에이전트 — 모노 사운드 분석 (agents/오디오/playbook_모노.md 4-1·4-2).

입력: work/모노/<시퀀스>.json  (ExtendScript로 읽은 시퀀스 오디오 트랙·클립 목록)
출력: work/모노/<시퀀스>_plan.json, 콘솔 요약
  - 두 마이크 녹음 확인 (좌우 상관, 말할 때 좌우 차이)
  - 두 사람 음량이 같아지는 섞는 비율 (채널 혼합기 교차값)
  - 섞은 소리의 말 구간 피크 중앙값을 −5 dB로 만드는 게인 (선택적 제한 입력 증폭)
실행: .venv/Scripts/python scripts/audio/mono.py work/모노/<시퀀스>.json [트랙번호=1]
"""
import collections
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import levels as L  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")

TARGET = -5.0
CEIL = 0.94          # 선택적 제한 최대 진폭 −6 dB
DOM_DB = 4.0         # 이보다 좌우 차이가 크면 그쪽 마이크 주인이 말하는 것
TWO_MIC_MIN = 6.0    # 말할 때 좌우 차이 중앙값(절댓값)이 이보다 작으면 두 마이크 녹음이 아닐 수 있음


def pk99(x):
    return float(20 * np.log10(np.quantile(np.abs(x), 0.99) + 1e-9))


def frames(m):
    f = int(0.05 * L.SR)
    k = len(m) // f
    db = 20 * np.log10(np.sqrt((m[:k * f].reshape(k, f, 2) ** 2).mean(1)) + 1e-9)
    loud = db.max(1)
    sp = loud > np.percentile(loud, 10) + 20
    return f, k, sp, db[:, 0] - db[:, 1]


def two_mic_check(tr):
    """한 원본 파일의 클립들이 두 마이크(좌·우 각각) 녹음인지."""
    m = L.mix(tr, max(c["end"] for c in tr))
    _, _, sp, dd = frames(m)
    nz = np.abs(m).max(1) > 0
    corr = float(np.corrcoef(m[nz, 0], m[nz, 1])[0, 1])
    absdiff = float(np.median(np.abs(dd[sp]))) if sp.sum() else 0.0
    return absdiff >= TWO_MIC_MIN and corr < 0.5, corr, absdiff


def main(path, track_no=1):
    d = json.load(open(path, encoding="utf-8"))
    clips = [c for c in d["tracks"][track_no - 1] if not c["disabled"]]
    src = collections.Counter(c["path"] for c in clips)
    used, skipped = [], []
    for p in src:   # 원본 파일마다 두 마이크 녹음인지 확인 (엔딩 영상 등은 빠짐)
        ok, corr, absdiff = two_mic_check([{"track": "", **c} for c in clips if c["path"] == p])
        (used if ok else skipped).append(p)
        print(f"  {os.path.basename(p)} {src[p]}개: 상관 {corr:.2f}, 말할 때 좌우차 {absdiff:.1f} dB → {'두 마이크' if ok else '제외'}")
    if not used:
        print(f"{d['name']}: 두 마이크 녹음 클립 없음 — 사용자 확인 필요")
        return
    main_src = used[0] if len(used) == 1 else " + ".join(os.path.basename(p) for p in used)
    tr = [{"track": f"A{track_no}", **c} for c in clips if c["path"] in used]
    end = max(c["end"] for c in tr)
    m = L.mix(tr, end)
    SR = L.SR
    f, k, sp, dd = frames(m)
    Lf, Rf = sp & (dd > DOM_DB), sp & (dd < -DOM_DB)
    nz = np.abs(m).max(1) > 0
    corr = float(np.corrcoef(m[nz, 0], m[nz, 1])[0, 1])
    absdiff = float(np.median(np.abs(dd[sp])))
    two_mic = True

    Ls = np.pad(np.repeat(Lf, f), (0, len(m) - k * f))
    Rs = np.pad(np.repeat(Rf, f), (0, len(m) - k * f))
    ratio = {"a": 1.0, "b": 1.0, "diff_1to1": None, "diff": None}
    if Lf.sum() > 20 and Rf.sum() > 20:
        mono1 = m[:, 0] + m[:, 1]
        ratio["diff_1to1"] = round(pk99(mono1[Ls]) - pk99(mono1[Rs]), 2)
        best = None
        for r in np.arange(0.5, 2.001, 0.01):          # b/a
            a, b = (1.0, r) if r <= 1 else (1 / r, 1.0)
            mono = a * m[:, 0] + b * m[:, 1]
            df = pk99(mono[Ls]) - pk99(mono[Rs])
            if best is None or abs(df) < abs(best[0]):
                best = (df, a, b)
        ratio.update(diff=round(best[0], 2), a=round(float(best[1]), 3), b=round(float(best[2]), 3))
    a, b = ratio["a"], ratio["b"]
    mono = a * m[:, 0] + b * m[:, 1]
    mm = np.stack([mono, mono], 1)
    segs = [s for s in L.speech_segments(mm) if s["end"] - s["start"] >= 0.3]
    med = float(np.median([L.peak_db(mm[int(s["start"] * SR):int(s["end"] * SR)]) for s in segs]))
    gain = round(TARGET - med, 2)
    plan = {
        "name": d["name"], "id": d["id"], "track": track_no, "source": main_src, "sources": used,
        "clip_ids": [c["clip_id"] for c in tr], "other_sources": skipped,
        "end": round(end, 2), "corr": round(corr, 3), "speech_absdiff_db": round(absdiff, 1),
        "frames_left_owner": int(Lf.sum()), "frames_right_owner": int(Rf.sum()), "two_mic": bool(two_mic),
        "ratio": ratio,
        "mixer": {"LtoL": round(0.5 + a / 2, 4), "RtoL": round(0.5 + b / 2, 4),
                  "LtoR": round(0.5 + a / 2, 4), "RtoR": round(0.5 + b / 2, 4)},
        "speech_segments": len(segs), "mix_peak_median_db": round(med, 2), "gain_db": gain,
        "limiter": {"max": CEIL, "boost": round((gain + 40) / 60, 4)},
    }
    out = path.replace(".json", "_plan.json")
    json.dump(plan, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{d['name']}: {os.path.basename(main_src)} {len(tr)}개, {end:.0f}초 | 상관 {corr:.2f}, 말할 때 좌우차 {absdiff:.1f} dB"
          f" | 제외: {[os.path.basename(p) for p in skipped]}")
    print(f"  왼쪽 주인 {Lf.sum()} / 오른쪽 주인 {Rf.sum()} 프레임 | 1:1 차이 {ratio['diff_1to1']} dB → "
          f"왼쪽 {a * 100:.0f}% : 오른쪽 {b * 100:.0f}% (차이 {ratio['diff']} dB)")
    print(f"  말 구간 {len(segs)}개, 섞은 소리 피크 중앙값 {med:.2f} dB → 게인 {gain:+.2f} dB "
          f"(입력 증폭 {plan['limiter']['boost']}) | 혼합기 {plan['mixer']}")


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 1)
