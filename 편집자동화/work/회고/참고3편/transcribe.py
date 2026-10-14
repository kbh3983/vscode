"""참고 3편 — 시퀀스 말소리(A1·A2 중 메인 마이크)를 시퀀스 시간으로 받아 적기 (faster-whisper 단어 시간) → <이름>_words.json, <이름>_lines.json
사용: .venv/Scripts/python work/회고/참고3편/transcribe.py"""
import json, os, subprocess, sys
import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
H = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(H, "..", "..", "..", "scripts", "subtitle"))
from asr_pipeline import add_cuda_dlls   # noqa: E402

SR = 16000


def seq_audio(clips, end):
    out = np.zeros(int(end * SR) + SR, np.float32)
    for c in clips:
        if not c.get("path") or c["e"] - c["s"] < 0.02:
            continue
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{c['in']:.3f}", "-t", f"{c['e'] - c['s']:.3f}", "-i", c["path"],
                              "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True).stdout
        x = np.frombuffer(raw, np.float32); i = int(c["s"] * SR)
        out[i:i + len(x)] = x[:len(out) - i]
    return out


add_cuda_dlls()
from faster_whisper import WhisperModel
model = WhisperModel("large-v3", device="cuda", compute_type="float16")
for nm in ["기초체력", "스틱터틀볼", "둔근1"]:
    d = json.load(open(os.path.join(H, nm + ".json"), encoding="utf-8"))
    pm = {c["name"]: c["path"] for t in d["video"] for c in t["clips"] if c.get("path")}
    for t in d["audio"]:
        for c in t["clips"]:
            if not c.get("path"): c["path"] = pm.get(c["name"], "")
    # 메인 마이크 = 소리가 더 큰 트랙 (A1/A2 중)
    best, lv = None, -1
    for t in d["audio"][:2]:
        cl = [c for c in t["clips"] if c.get("path") and "엔딩" not in c["name"]]
        if not cl: continue
        c = max(cl, key=lambda c: c["e"] - c["s"])
        x = seq_audio([c], c["e"])
        r = float(np.sqrt((x ** 2).mean()))
        if r > lv: best, lv = cl, r
    au = seq_audio(best, d["end"])
    segs, _ = model.transcribe(au, language="ko", word_timestamps=True, vad_filter=True, beam_size=5, condition_on_previous_text=False)
    words, lines = [], []
    for s in segs:
        lines.append({"s": round(s.start, 2), "e": round(s.end, 2), "t": s.text.strip()})
        for w in s.words or []:
            words.append({"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)})
    json.dump(words, open(os.path.join(H, nm + "_words.json"), "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(lines, open(os.path.join(H, nm + "_lines.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(nm, best[0]["name"], len(lines), "lines", len(words), "words")
