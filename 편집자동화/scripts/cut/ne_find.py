"""컷편집 에이전트 — 최박사 습관 "네" 지울 구간 찾기 (criteria [최박사] 습관적인 "네", 2026-10-22 누워서 방식을 도구로)

실행: .venv/bin/python scripts/cut/ne_find.py work/<p> <candidates.json> <out_ne_plan.json>
candidates.json: [{"t": 정렬된 "네" 시각(없으면 자막 줄 시작), "prev_end": 앞 말 끝, "next_start": 다음 말 시작,
                   "mode": "pause"(운동 중 아님 — 네 + 앞뒤 쉼) | "sound"(운동 중 — 네 소리만, 점프컷 마커), "cue": 자막 줄,
                   "force": true(선택 — 사용자가 확인한 것: 받아쓰기 확인 건너뜀. 필러 "어"처럼 네가 아닌 짧은 소리에도)}]
하는 일:
  1. 앞 말 끝 ~ 다음 말 시작 사이에서 소리 덩어리(바닥 잡음 +12 dB)를 찾아 "네"에 가장 가까운 덩어리를 고름 — "네"는 정렬이 짧고 자주 틀려서
  2. 그 덩어리만 받아쓰기(faster-whisper) → "네/예"가 아니면 review (10/22: 0.1초 구간 무음 환각 3곳)
  3. 경계: pause = 앞 말 끝 + 0.2초 ~ 다음 말 시작 − 0.1초 (사용자 0:19.7·0:25.3 직접 수정)
           sound = 덩어리 ± 0.04초. 덩어리가 앞뒤 말과 붙어 있으면 ±0.15초 안의 6 dB 쉼, 없으면 review
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "subtitle"))
import asr_pipeline as P  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")

FRAME = 0.02
BLOB_DB = 12.0     # 바닥 잡음보다 이만큼 크면 소리
DIP_DB = 6.0
SNAP = 0.15
PAD_SOUND = 0.04
KEEP_PREV = 0.2
KEEP_NEXT = 0.1
NE_WORDS = ("네", "예", "내", "넵")


def frame_db(audio):
    n = int(FRAME * P.SR)
    k = len(audio) // n
    return 20 * np.log10(np.sqrt((audio[:k * n].reshape(k, n) ** 2).mean(1)) + 1e-9)


def blobs(db, a, b, floor):
    i0, i1 = int(a / FRAME), int(b / FRAME) + 1
    on = db[i0:i1] > floor + BLOB_DB
    out, s = [], None
    for k, v in enumerate(on):
        if v and s is None:
            s = k
        if not v and s is not None:
            out.append(((i0 + s) * FRAME, (i0 + k) * FRAME)); s = None
    if s is not None:
        out.append(((i0 + s) * FRAME, i1 * FRAME))
    return [x for x in out if x[1] - x[0] >= 0.06]


def dip(db, t):
    a, b = int((t - SNAP) / FRAME), int((t + SNAP) / FRAME) + 1
    i = a + int(np.argmin(db[a:b]))
    around = db[max(0, a - 10):b + 10]
    return round(i * FRAME + FRAME / 2, 3) if np.percentile(around, 90) - db[i] >= DIP_DB else None


def main(work, cand_path, out_path):
    audio = P.read_wav(os.path.join(work, "subtitle", "audio.wav"))
    db = frame_db(audio)
    floor = float(np.percentile(db[db > -90], 10))
    from faster_whisper import WhisperModel
    model = WhisperModel("large-v3", device="cpu" if sys.platform == "darwin" else "cuda",
                         compute_type="int8" if sys.platform == "darwin" else "float16")
    rows = []
    for c in json.load(open(cand_path, encoding="utf-8")):
        r = dict(c)
        bl = blobs(db, c["prev_end"] + 0.02, c["next_start"] - 0.02, floor)
        if not bl:
            r.update(act="review", why="앞뒤 말 사이에 소리 덩어리 없음 (붙어 있음)"); rows.append(r); continue
        s, e = min(bl, key=lambda x: abs((x[0] + x[1]) / 2 - c["t"]))
        x = audio[int(max(0, s - 0.15) * P.SR):int((e + 0.15) * P.SR)]
        segs, _ = model.transcribe(x, language="ko", beam_size=5, temperature=0.0, vad_filter=False,
                                   condition_on_previous_text=False)
        heard = " ".join(z.text.strip() for z in segs).strip()
        r.update(blob=[round(s, 3), round(e, 3)], heard=heard)
        if not c.get("force") and (not any(w in heard for w in NE_WORDS) or len(heard.replace(" ", "")) > 4):   # force = 사용자가 들어 보고 지우라고 한 것
            r.update(act="review", why=f"받아쓰기 '{heard}' — 네인지 확인 필요"); rows.append(r); continue
        if c["mode"] == "pause":
            a, z = c["prev_end"] + KEEP_PREV, c["next_start"] - KEEP_NEXT
            if z - a < (e - s):
                a, z = s - PAD_SOUND, e + PAD_SOUND
        else:
            a, z = s - PAD_SOUND, e + PAD_SOUND
            if a < c["prev_end"] + 0.02:
                a = dip(db, s)
            if z > c["next_start"] - 0.02:
                z = dip(db, e)
            if a is None or z is None:
                r.update(act="review", why="소리 덩어리가 앞뒤 말과 붙음(쉼 없음)"); rows.append(r); continue
        r.update(act="delete", s=round(a, 3), e=round(z, 3), len=round(z - a, 3))
        rows.append(r)
    json.dump({"floor": floor, "rows": rows}, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for r in rows:
        print(f"{r['t']:8.2f} {r['mode']:5} {r['act']:6} {r.get('s', ''):>8} {r.get('e', ''):>8} '{r.get('heard', '')}' {r.get('why', '')} | {r.get('cue', '')}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
