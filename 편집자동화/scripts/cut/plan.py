"""컷편집 에이전트 — 탐지·판단 결과를 edit_decisions.json으로 만든다.

입력: work/<p>/cut/manual.json  (에이전트가 대본을 읽고 판단한 C2~C8 컷, 반복 동작 구간, 테이크 그룹)
      work/<p>/subtitle/audio.wav, subtitle.json (단어 시간)
출력: work/<p>/cut/edit_decisions.json, 콘솔 요약
C1 무음은 여기서 오디오로 찾는다. 기준값: agents/컷편집/criteria.md
실행: .venv/Scripts/python scripts/cut/plan.py work/<p>
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "subtitle"))
import asr_pipeline as P  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")

SIL_DB = -40.0       # 무음 판정 음량
SIL_MIN = 0.7        # 긴 무음 판정 길이
KEEP_BREATH = 0.3    # 줄인 뒤 남길 호흡 (앞뒤 반씩)
REVIEW_LONG = 2.0    # 이보다 긴 무음은 동작 시연일 수 있어 review
FRAME = 0.02
MIN_CONF = 0.8
WORD_TASKS = ("C4", "C5", "C8")   # 단어 단위 컷: 정렬 시간만 믿지 않고 오디오 쉼으로 경계 확인
SNAP = 0.15          # 경계 주변 탐색 범위 (초)
DIP_DB = 6.0         # 쉼 판정: 경계 주변 최저 음량이 주변 말소리보다 이만큼 낮아야 함


def frame_db(audio):
    n = int(FRAME * P.SR)
    k = len(audio) // n
    return 20 * np.log10(np.sqrt((audio[:k * n].reshape(k, n) ** 2).mean(1)) + 1e-9)


def snap_to_dip(db, t):
    """t 주변 ±SNAP 안의 가장 조용한 지점. 주변 말소리보다 DIP_DB 이상 낮지 않으면 None."""
    a, b = int((t - SNAP) / FRAME), int((t + SNAP) / FRAME) + 1
    i = a + int(np.argmin(db[a:b]))
    around = db[max(0, a - 10):b + 10]
    if np.percentile(around, 90) - db[i] < DIP_DB:
        return None
    return round(i * FRAME + FRAME / 2, 3)


def silences(audio, words):
    n = int(FRAME * P.SR)
    k = len(audio) // n
    db = 20 * np.log10(np.sqrt((audio[:k * n].reshape(k, n) ** 2).mean(1)) + 1e-9)
    db = np.convolve(db, np.ones(5) / 5, mode="same")   # 잡음 튐 하나에 무음이 끊기지 않게
    quiet = db < SIL_DB
    for w in words:   # 정렬된 단어 위에는 무음 없음 (작게 말한 끝음절 보호)
        quiet[int(w["start"] / FRAME):int(w["end"] / FRAME) + 1] = False
    runs, s = [], None
    for i, q in enumerate(quiet):
        if q and s is None:
            s = i
        elif not q and s is not None:
            runs.append((s * FRAME, i * FRAME))
            s = None
    if s is not None:
        runs.append((s * FRAME, k * FRAME))
    return [r for r in runs if r[1] - r[0] >= SIL_MIN]


def overlaps(a, b, ranges):
    return any(a < e and b > s for s, e in ranges)


def tc(sec, fps):
    f = int(round(sec * fps))
    fr = int(round(fps))
    return f"{f // (fr * 3600):02d}:{f // (fr * 60) % 60:02d}:{f // fr % 60:02d}:{f % fr:02d}"


def main(work):
    out = os.path.join(work, "cut")
    man = json.load(open(os.path.join(out, "manual.json"), encoding="utf-8"))
    sub = json.load(open(os.path.join(work, "subtitle", "subtitle.json"), encoding="utf-8"))
    fps = sub["sequence"]["fps"]
    words = [w for c in sub["cues_final"] if c["words"] for w in c["words"]]
    audio = P.read_wav(os.path.join(work, "subtitle", "audio.wav"))

    db = frame_db(audio)
    decisions = []
    for c in man["cuts"]:
        act = c["action"] if c["confidence"] >= MIN_CONF else "review"
        c = {**c, "action": act, "keep_reason": None}
        if c["task"] in WORD_TASKS and act == "delete":
            s, e = snap_to_dip(db, c["start"]), snap_to_dip(db, c["end"])
            if s is None or e is None:
                c["action"] = "review"
                c["reason"] += " — 컷 경계에 오디오 쉼이 없어 앞뒤 말이 잘릴 수 있음"
            else:
                c["start"], c["end"] = s, e
        decisions.append(c)

    manual_ranges = [(c["start"], c["end"]) for c in man["cuts"] if c["action"] == "delete"]
    keep_ranges = [(k["start"], k["end"]) for k in man["keep_silence"]]
    take_ranges = [(t["start"], t["end"]) for g in man["takes"] for t in g["takes"]]
    n_keep = 0
    for s, e in silences(audio, words):
        if overlaps(s, e, manual_ranges):
            continue
        if overlaps(s, e, keep_ranges):
            n_keep += 1
            decisions.append({"task": "C1", "start": round(s, 3), "end": round(e, 3), "action": "keep",
                              "confidence": 1.0, "text": "", "reason": f"무음 {e - s:.1f}초",
                              "keep_reason": "반복 동작 시연 구간"})
            continue
        a, b = s + KEEP_BREATH / 2, e - KEEP_BREATH / 2
        long_ = e - s >= REVIEW_LONG
        decisions.append({"task": "C1", "start": round(a, 3), "end": round(b, 3),
                          "action": "review" if long_ else "delete", "confidence": 0.6 if long_ else 0.85,
                          "text": "", "reason": f"무음 {e - s:.1f}초 → {KEEP_BREATH}초 남김"
                          + (" (2초 이상: 동작·자세 잡는 장면일 수 있음)" if long_ else ""),
                          "keep_reason": None})

    decisions.sort(key=lambda d: d["start"])
    confirmed = man.get("confirmed_ids_before", [])
    for d in decisions:   # 사용자가 리뷰로 확인한 삭제 → Premiere에서 클립을 지운다
        d["confirmed"] = d["action"] == "delete" and any(
            k.split("@")[0] == d["task"] and abs(float(k.split("@")[1]) - d["start"]) < 0.05 for k in confirmed)
    for i, d in enumerate(decisions, 1):
        d["id"] = f"cut_{i:04d}"
        d["start_tc"], d["end_tc"] = tc(d["start"], fps), tc(d["end"], fps)
    total = man["duration"]
    json.dump({"sequence": man["sequence"], "fps": fps, "decisions": decisions, "takes": man["takes"]},
              open(os.path.join(out, "edit_decisions.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    dl = [d for d in decisions if d["action"] == "delete"]
    print(f"전체 {total:.1f}초")
    by = {}
    for d in dl:
        by.setdefault(d["task"], []).append(d["end"] - d["start"])
    for t in sorted(by):
        print(f"  삭제 {t}: {len(by[t])}개, {sum(by[t]):.1f}초")
    cut_sec = sum(d["end"] - d["start"] for d in dl)
    print(f"삭제 합계 {len(dl)}개, {cut_sec:.1f}초 → 남는 길이 {total - cut_sec:.1f}초 ({(total - cut_sec) / 60:.1f}분)")
    print(f"확인 필요(review) {sum(d['action'] == 'review' for d in decisions)}개, 반복 동작이라 남긴 무음 {n_keep}개")
    short = [d for d in dl if d["end"] - d["start"] < 0.2]
    print(f"0.2초 미만 짧은 삭제 {len(short)}개")


if __name__ == "__main__":
    main(sys.argv[1])
