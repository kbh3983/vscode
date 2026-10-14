"""컷전환 에이전트 — 시퀀스 시각의 원본 프레임 뽑기 (Premiere 렌더 없이 원본 파일에서).

  python frames.py <video.json> <out.jpg> <트랙> <t1> <t2> ...   트랙 = V1 / V2, 시각은 초
여러 시각을 가로 4장씩 이어 붙인 한 장(라벨 = 시각)으로 저장.
"""
import json
import os
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8")


def clip_at(d, track, t):
    for c in d["tracks"][track]:
        if c["start"] <= t < c["end"]:
            return c
    return None


def grab(c, t, out, label):
    src_t = c["in"] + (t - c["start"])
    vf = "scale=480:-2,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='" + label + "':x=8:y=8:fontsize=28:fontcolor=yellow:box=1:boxcolor=black@0.6"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{src_t:.3f}", "-i", c["path"], "-frames:v", "1", "-vf", vf, out], check=True)


def main(vj, out, track, *ts):
    d = json.load(open(vj, encoding="utf-8"))
    tmp = tempfile.mkdtemp()
    files = []
    for k, t in enumerate(map(float, ts)):
        c = clip_at(d, track, t)
        if not c or not c["path"]:
            continue
        f = os.path.join(tmp, f"{k:03d}.jpg")
        grab(c, t, f, f"{track} {int(t // 60)}m{t % 60:04.1f}s")
        files.append(f)
    cols = 4
    while len(files) % cols:
        files.append(files[-1])
    rows = [files[i:i + cols] for i in range(0, len(files), cols)]
    inputs, flt = [], []
    for f in files:
        inputs += ["-i", f]
    n = len(files)
    layout = "|".join(f"{480 * (i % cols)}_{270 * (i // cols)}" for i in range(n))
    scale = "".join(f"[{i}:v]scale=480:270[s{i}];" for i in range(n))
    flt = scale + "".join(f"[s{i}]" for i in range(n)) + f"xstack=inputs={n}:layout={layout}"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", flt, "-frames:v", "1", out], check=True)
    print(out, len(rows), "rows")


if __name__ == "__main__":
    main(*sys.argv[1:])
