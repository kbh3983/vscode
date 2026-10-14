"""포인트 에이전트 — 포인트 구간 대사의 단어별 실제 시간 (plan.py 4번째 인자 words.json)

사용 (프로젝트 가상환경, GPU): .venv/Scripts/python scripts/point/cue_words.py <audio.json> <srt> <points.json> <out_words.json>
  audio.json: dump_audio.jsx 결과 (말소리 트랙 클립: 시퀀스 s·e, 원본 in, path)
  구간마다 [첫 대사 시작 - 0.5, 끝 대사 끝 + 0.5]의 소리를 원본 파일에서 꺼내 faster-whisper(단어 시간)로 듣는다
  → [{"w": 단어, "s": 시퀀스 초, "e": 시퀀스 초, "s_asr": Whisper 원래 시작}]
  단어 시작은 소리 크기로 보정 (Whisper는 창 첫 단어 시작을 창 시작으로 잡는 일이 많음 — 옆구리살 시험에서 −15프레임 몰림)
왜 (2026-10-12 회고): SRT 줄 시작에 맞춘 포인트 자막이 사용자 최종본보다 50~70프레임 빨랐음 — "그 말이 나오는 순간"에 맞추기 위해
"""
import json, os, subprocess, sys
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "subtitle"))
from asr_pipeline import add_cuda_dlls   # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
SR = 16000
PAD = 0.5


def srt_times(path):
    import re
    def sec(s):
        h, m, r = s.split(":"); s2, ms = r.split(",")
        return int(h) * 3600 + int(m) * 60 + int(s2) + int(ms) / 1000
    cues = {}
    for b in re.split(r"\n\s*\n", open(path, encoding="utf-8-sig").read().strip()):
        l = b.strip().split("\n")
        a, z = l[1].split(" --> ")
        cues[int(l[0])] = (sec(a.strip()), sec(z.strip()), " ".join(l[2:]))
    return cues


def cut(clips, a, b):
    """시퀀스 [a, b] 소리 (클립 사이 빈 곳은 무음)"""
    out = np.zeros(int((b - a) * SR), np.float32)
    for c in clips:
        lo, hi = max(a, c["s"]), min(b, c["e"])
        if hi - lo < 0.02:
            continue
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{c['in'] + lo - c['s']:.3f}", "-t", f"{hi - lo:.3f}", "-i", c["path"],
                              "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32)
        i = int((lo - a) * SR); out[i:i + len(x)] = x[:len(out) - i]
    return out


HOP = 0.01


def onset_env(x):
    """10ms 간격 소리 크기(RMS)"""
    n = int(HOP * SR); k = len(x) // n
    return np.sqrt((x[:k * n].reshape(k, n) ** 2).mean(1)) if k else np.zeros(1)


def onset(env, ws, we, first=False):
    """Whisper 단어 시작은 앞이 조용해도 일찍 잡힘(특히 창 첫 단어 = 창 시작) → 그 단어 안에서 소리가 실제로 커지는 곳으로 늦춤"""
    thr = 0.2 * np.percentile(env, 95)
    i0, i1 = int(ws / HOP), max(int(ws / HOP) + 1, int(we / HOP))
    if not first and i0 < len(env) and env[i0] > thr:
        return ws   # 이미 말소리 중 (앞 단어에 이어짐)
    if first:   # 창 첫 단어: 창 앞쪽 소리(다른 사람 말 끝 등)를 건너뛰고, 조용해졌다가 다시 커지는 곳
        i = i0
        while i < min(i1, len(env)) and env[i] > thr: i += 1
        if i >= min(i1, len(env)): return ws
        i0 = i
    for i in range(i0, min(i1, len(env))):
        if env[i] > thr:
            return i * HOP
    return ws


def main(audio_json, srt, points_json, out_json):
    clips = json.load(open(audio_json, encoding="utf-8"))
    cues = srt_times(srt)
    pts = json.load(open(points_json, encoding="utf-8"))["points"]
    add_cuda_dlls()
    from faster_whisper import WhisperModel
    model = WhisperModel("large-v3", device="cuda", compute_type="float16")
    words = []
    for p in pts:
        a, z = p["cues"]
        t0, t1 = cues[a][0] - PAD, cues[z][1] + PAD
        prompt = " ".join(cues[i][2] for i in range(a, z + 1))
        x = cut(clips, t0, t1)
        segs, _ = model.transcribe(x, language="ko", beam_size=5, temperature=0.0, word_timestamps=True,
                                   vad_filter=False, condition_on_previous_text=False, initial_prompt=prompt)
        env = onset_env(x)
        got = []
        for s in segs:
            for w in (s.words or []):
                st = onset(env, w.start, w.end, first=not got and w.start < 0.1)
                got.append({"w": w.word.strip(), "s": round(t0 + st, 3), "e": round(t0 + w.end, 3), "s_asr": round(t0 + w.start, 3)})
        words += got
        print(f"{a}-{z} {cues[a][0]:8.2f}  {' '.join(x['w'] for x in got)[:60]}")
    words.sort(key=lambda w: w["s"])
    json.dump(words, open(out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(len(words), "words")


if __name__ == "__main__":
    main(*sys.argv[1:5])
