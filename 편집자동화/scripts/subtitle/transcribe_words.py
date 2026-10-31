"""받아쓰기 (단어 시간) — 컷편집 입력용 transcript.json·transcript.txt·audio.wav (2026-10-29, 261020·261027 최박사)
실행: .venv/bin/python scripts/subtitle/transcribe_words.py <영상 파일> <출력 폴더> [시퀀스 시작 오프셋초=0]
  transcript.json = [{"s","e","t","w":[[s,e,단어],...]}] (시퀀스 시간 = 파일 시간 + 오프셋), audio.wav = 16k 모노
"""
import json, os, subprocess, sys
src, out = sys.argv[1], sys.argv[2]; off = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
os.makedirs(out, exist_ok=True)
wav = os.path.join(out, "audio.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", "16000", wav], check=True)
from faster_whisper import WhisperModel
m = WhisperModel("large-v3", device="cpu", compute_type="int8")
segs, _ = m.transcribe(wav, language="ko", beam_size=5, word_timestamps=True, vad_filter=True, condition_on_previous_text=False)
rows = []
for s in segs:
    rows.append({"s": round(s.start + off, 2), "e": round(s.end + off, 2), "t": s.text.strip(),
                 "w": [[round(w.start + off, 2), round(w.end + off, 2), w.word.strip()] for w in s.words]})
json.dump(rows, open(os.path.join(out, "transcript.json"), "w", encoding="utf-8"), ensure_ascii=False)
with open(os.path.join(out, "transcript.txt"), "w", encoding="utf-8") as f:
    for r in rows: f.write(f"{int(r['s'] // 60):02d}:{r['s'] % 60:05.2f} {r['t']}\n")
print(len(rows), "줄")
