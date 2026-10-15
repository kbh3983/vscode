"""숏폼 레퍼런스 분석: 받아쓰기(단어 시간) + 컷 지점 + 프레임(컷마다·2초마다) + 오디오 트랙 비교
  python analyze.py <영상 폴더> <출력 폴더>
"""
import glob, json, os, re, subprocess, sys
import numpy as np
sys.path.insert(0, "C:/DADA/9.AI/vscode/편집자동화/scripts/subtitle")
from asr_pipeline import add_cuda_dlls
add_cuda_dlls()
from faster_whisper import WhisperModel

src_dir, out_dir = sys.argv[1], sys.argv[2]
model = WhisperModel("large-v3", device="cuda", compute_type="float16")

def audio(path, stream):
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-map", f"0:a:{stream}", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.int16).astype(np.float32) / 32768

def cuts(path):
    r = subprocess.run(["ffmpeg", "-i", path, "-vf", "select='gt(scene,0.25)',showinfo", "-an", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="ignore")
    return [round(float(m), 2) for m in re.findall(r"pts_time:([0-9.]+)", r.stderr)]

for i, path in enumerate(sorted(glob.glob(os.path.join(src_dir, "*.mp4")))):
    tag = f"r{i + 1}"; d = os.path.join(out_dir, tag); os.makedirs(d, exist_ok=True)
    title = os.path.splitext(os.path.basename(path))[0]
    a0, a1 = audio(path, 0), audio(path, 1)
    n = min(len(a0), len(a1))
    diff = float(np.sqrt(np.mean((a0[:n] - a1[:n]) ** 2)) / (np.sqrt(np.mean(a0[:n] ** 2)) + 1e-9))
    segs, _ = model.transcribe(a0, language="ko", word_timestamps=True, vad_filter=False, condition_on_previous_text=False)
    S = [dict(s=round(s.start, 2), e=round(s.end, 2), t=s.text.strip(), w=[[round(w.start, 2), round(w.end, 2), w.word] for w in s.words]) for s in segs]
    C = cuts(path)
    # 소리 크기 곡선(0.1초) — 말 없는 곳의 바닥 소음으로 배경음 여부
    H = 1600; rms = [float(20 * np.log10(np.sqrt(np.mean(a0[k:k + H] ** 2)) + 1e-9)) for k in range(0, len(a0) - H, H)]
    json.dump(dict(title=title, file=path, track_diff=round(diff, 3), segs=S, cuts=C, rms=[round(x, 1) for x in rms]), open(os.path.join(d, "data.json"), "w", encoding="utf-8"), ensure_ascii=False)
    dur = len(a0) / 16000
    times = sorted(set([round(t, 2) for t in np.arange(0.2, dur, 2.0)] + [min(round(c + 0.15, 2), dur - 0.1) for c in C]))
    for t in times:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", path, "-frames:v", "1", "-vf", "scale=270:-2", os.path.join(d, f"f_{t:06.2f}.jpg")])
    print(tag, title, "| 길이 %.1f초 | 컷 %d | 대사 %d줄 | 오디오 두 트랙 차이 %.3f" % (dur, len(C), len(S), diff))
