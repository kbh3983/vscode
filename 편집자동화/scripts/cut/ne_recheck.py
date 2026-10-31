"""컷편집 에이전트 — 최종 컷(ops_final.txt X 구간을 뺀 소리)을 다시 받아쓰기해 남은 '네' 찾기 (criteria [최박사] 찾는 범위, 2026-10-26)
실행: .venv/bin/python scripts/cut/ne_recheck.py <work 폴더> — subtitle/audio.wav = 시퀀스 시간 소리여야 함
출력: cut/final_words.json, 콘솔에 남은 '네' (최종 시퀀스 시간 / 원래 시간)"""
import json, sys
import numpy as np
sys.path.insert(0, "scripts/subtitle"); import asr_pipeline as P
FPS = 30000 / 1001; W = sys.argv[1]
X = sorted(tuple(map(int, l.split("|")[1:])) for l in open(f"{W}/cut/ops_final.txt") if l.startswith("X"))
audio = P.read_wav(f"{W}/subtitle/audio.wav"); n = int(len(audio) / P.SR * FPS)
keep, p = [], 0
for a, b in X:
    if a > p: keep.append((p, min(a, n)))
    p = b
if p < n: keep.append((p, n))
keep = [(a, b) for a, b in keep if b > a]
seg = np.concatenate([audio[int(a / FPS * P.SR):int(b / FPS * P.SR)] for a, b in keep])
def n2o(t):
    f = t * FPS
    for a, b in X:
        if a <= f: f += b - a
    return f / FPS
from faster_whisper import WhisperModel
m = WhisperModel("large-v3", device="cpu", compute_type="int8")
segs, _ = m.transcribe(seg, language="ko", beam_size=5, word_timestamps=True, vad_filter=True, condition_on_previous_text=False)
rows, hits = [], []
for s in segs:
    ws = [(w.start, w.end, w.word.strip()) for w in s.words]
    rows.append({"s": s.start, "e": s.end, "t": s.text.strip(), "w": ws})
    for a, b, w in ws:
        if w.strip(",.?!") in ("네", "예", "넵", "네네"): hits.append((a, n2o(a), s.text.strip()))
json.dump(rows, open(f"{W}/cut/final_words.json", "w", encoding="utf-8"), ensure_ascii=False)
for a, o, t in hits: print(f"{int(a // 60)}:{a % 60:05.2f} (원래 {o:.2f})  {t[:60]}")
print("남은 네", len(hits))
