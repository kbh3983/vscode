"""레퍼런스 분석 — 오디오를 목소리 / 음악·효과음으로 나누기 (demucs htdemucs, GPU)
  python separate.py <audio.wav> <out 폴더>  → vocals.wav, drums.wav, bass.wav, other.wav, music.wav(= 목소리 뺀 나머지 합)
torchaudio 없이 soundfile로 읽고 쓴다 (설치된 torchaudio가 torch와 버전이 달라서)
"""
import os, sys
import numpy as np, soundfile as sf, torch
from demucs.pretrained import get_model
from demucs.apply import apply_model

src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
wav, sr = sf.read(src, dtype="float32", always_2d=True)          # (n, 2)
m = get_model("htdemucs"); m.cuda().eval()
assert sr == m.samplerate, (sr, m.samplerate)
x = torch.from_numpy(wav.T.copy())                                  # (2, n)
ref = x.mean(0); mu, sd = ref.mean(), ref.std()
with torch.no_grad():
    y = apply_model(m, ((x - mu) / sd)[None], device="cuda", split=True, overlap=0.25, progress=False)[0] * sd + mu
rest = None
for name, s in zip(m.sources, y):
    a = s.cpu().numpy().T
    sf.write(os.path.join(out, name + ".wav"), a, sr, subtype="PCM_16")
    if name != "vocals": rest = a if rest is None else rest + a
sf.write(os.path.join(out, "music.wav"), rest, sr, subtype="PCM_16")
print("ok", out, m.sources)
