"""숏폼 에이전트 S1 — 롱폼 오디오(시퀀스에서 내보낸 wav) 받아쓰기, 단어 시간 포함 (= 롱폼 시퀀스 시간)
  python transcribe.py <wav> <out.json>
"""
import json, subprocess, sys
import numpy as np
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "subtitle"))
from asr_pipeline import add_cuda_dlls
add_cuda_dlls()
import ctranslate2
CUDA = ctranslate2.get_cuda_device_count() > 0   # 2026-10-27 맥(CUDA 없음)에서는 CPU int8
from faster_whisper import WhisperModel

wav, out = sys.argv[1], sys.argv[2]
a = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", wav, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True, check=True).stdout, np.int16).astype(np.float32) / 32768
model = WhisperModel("large-v3", device="cuda" if CUDA else "cpu", compute_type="float16" if CUDA else "int8")
segs, _ = model.transcribe(a, language="ko", word_timestamps=True, vad_filter=True, condition_on_previous_text=False)
R = [dict(s=round(s.start, 2), e=round(s.end, 2), t=s.text.strip(), w=[[round(w.start, 2), round(w.end, 2), w.word.strip()] for w in s.words]) for s in segs]
json.dump(R, open(out, "w", encoding="utf-8"), ensure_ascii=False)
print(out, len(R), "segments", "%.0f초" % (len(a) / 16000))
