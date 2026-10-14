"""컷편집 회고 — 잘린 구간에서 실제로 잘린 단어 (faster-whisper 단어 시간, 앞뒤 2초 문맥 포함해서 듣고 가운데가 컷 안인 단어만)
사용 (프로젝트 가상환경): .venv/Scripts/python work/회고/컷편집/cut_words.py  → cuts.json에 cut_words·before·after 추가
"""
import json, os, subprocess, sys
import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
H = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(H, "..", "..", "..", "scripts", "subtitle"))
from asr_pipeline import add_cuda_dlls   # noqa: E402

SR, PAD = 16000, 2.0
D = json.load(open(os.path.join(H, "cuts.json"), encoding="utf-8"))
# 영상별 원본 경로 (cut_dataset.py와 같은 방법)
sys.path.insert(0, H)
import importlib.util
paths = {}
for name, bf, ff, sf in [("옆구리살", "옆구리살_color.json", 0, 0), ("목교정기", "목교정기/color.json", 0, 0),
                         ("자세교정", "자세교정/shot.json", 0, 0), ("틀어진골반", "틀어진골반/shot.json", 0, 0)]:
    d = json.load(open(os.path.join(H, "..", bf), encoding="utf-8"))
    from collections import Counter
    nm = Counter(c["name"] for c in d["audio"][0]["clips"]).most_common(1)[0][0]
    p = None
    for g in ("audio", "video"):
        for t in d.get(g, []):
            for c in t["clips"]:
                if c["name"] == nm and c.get("path"): p = c["path"]
    if not p:
        import glob
        p = glob.glob(os.path.join(r"C:\DADA\1.프로젝트", "**", nm), recursive=True)[0]
    paths[name] = p
add_cuda_dlls()
from faster_whisper import WhisperModel
model = WhisperModel("large-v3", device="cuda", compute_type="float16")
for x in D["cuts"]:
    if x["len"] < 0.25:
        x["cut_words"] = ""; continue
    a = max(0, x["src"] - PAD)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{x['len'] + 2 * PAD:.3f}", "-i", paths[x["video"]],
                          "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True).stdout
    au = np.frombuffer(raw, np.float32)
    segs, _ = model.transcribe(au, language="ko", word_timestamps=True, vad_filter=False, beam_size=5)
    ws = [w for s in segs for w in (s.words or [])]
    c0, c1 = x["src"] - a, x["src"] - a + x["len"]
    mid = lambda w: (w.start + w.end) / 2
    x["cut_words"] = " ".join(w.word.strip() for w in ws if c0 <= mid(w) <= c1)
    x["before"] = " ".join(w.word.strip() for w in ws if mid(w) < c0)[-40:]
    x["after"] = " ".join(w.word.strip() for w in ws if mid(w) > c1)[:40]
    print(f"{x['video']} {x['tc']} {x['len']:.2f}s | {x['before'][-20:]} [{x['cut_words']}] {x['after'][:20]}")
json.dump(D, open(os.path.join(H, "cuts.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
