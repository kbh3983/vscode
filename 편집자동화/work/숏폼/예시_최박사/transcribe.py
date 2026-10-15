"""숏폼 예시 분석 — 롱폼(클린본) 받아쓰기 (faster-whisper large-v3, 문장 단위 시간)
  python transcribe.py <영상> <out.json> [시작초 끝초]
"""
import json, subprocess, sys
import numpy as np
sys.path.insert(0, "C:/DADA/9.AI/vscode/편집자동화/scripts/subtitle")
from asr_pipeline import add_cuda_dlls
add_cuda_dlls()
from faster_whisper import WhisperModel

src, out = sys.argv[1], sys.argv[2]
a = float(sys.argv[3]) if len(sys.argv) > 3 else 0
b = float(sys.argv[4]) if len(sys.argv) > 4 else None
model = WhisperModel("large-v3", device="cuda", compute_type="float16")
cmd = ["ffmpeg", "-v", "error", "-ss", str(a)] + (["-t", str(b - a)] if b else []) + ["-i", src, "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"]
audio = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.int16).astype(np.float32) / 32768
segs, _ = model.transcribe(audio, language="ko", vad_filter=True)
R = [dict(s=round(a + s.start, 2), e=round(a + s.end, 2), t=s.text.strip()) for s in segs]
json.dump(R, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(R), "segments")
