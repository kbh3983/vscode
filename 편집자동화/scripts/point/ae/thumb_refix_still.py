"""백업해 둔 템플릿 목록을 기준으로 미리보기 이미지를 다시 고른다.
'가장 꽉 찬 프레임' 대신 '멈춰 있는(앞뒤 프레임과 거의 같은) 프레임 중 내용이 가장 많은 것'을 쓴다
→ 잔상이 겹친 순간이나 움직이며 흐린 순간을 피하고, 다 나타난 뒤 또렷한 모습을 고른다.
사용: python thumbrefix.py <템플릿 루트> <백업 폴더>
"""
import io, os, subprocess, sys, tempfile, zipfile
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
root, backup = sys.argv[1], sys.argv[2]


def vis(a):
    return (a[..., 3] > 20) & (a[..., :3].max(-1) > 24) if a.shape[-1] == 4 else (a.max(-1) > 24)


def pick(mp4_bytes, size):
    with tempfile.TemporaryDirectory() as td:
        src = os.path.join(td, "t.mp4")
        open(src, "wb").write(mp4_bytes)
        subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", "fps=15", os.path.join(td, "f%04d.png")], check=True)
        files = sorted(f for f in os.listdir(td) if f.endswith(".png"))
        frames = [np.asarray(Image.open(os.path.join(td, f)).convert("RGB")).astype(np.int16) for f in files]
    if not frames:
        return None, 0
    cont = np.array([vis(f).mean() for f in frames])
    # 앞뒤 프레임과 달라진 픽셀 비율 (작을수록 멈춰 있음)
    diff = [1.0] * len(frames)
    for i in range(len(frames)):
        ds = []
        for j in (i - 1, i + 1):
            if 0 <= j < len(frames):
                ds.append((np.abs(frames[i] - frames[j]).max(-1) > 12).mean())
        diff[i] = max(ds) if ds else 0
    diff = np.array(diff)
    top = cont.max()
    if top < 0.003:
        return None, 0
    # 내용이 최대의 50% 이상인 프레임 중, 가장 멈춰 있는 것들(변화 최소+0.2%p 이내)에서 내용이 가장 많은 것
    cand = np.where(cont >= top * 0.5)[0]
    dmin = diff[cand].min()
    still = [i for i in cand if diff[i] <= dmin + 0.002]
    best = max(still, key=lambda i: (cont[i], i))
    img = Image.fromarray(frames[best].astype(np.uint8)).resize(size, Image.LANCZOS)
    return img, cont[best]


for dp, dn, fn in os.walk(backup):
    for f in sorted(fn):
        rel = os.path.relpath(os.path.join(dp, f), backup)
        p = os.path.join(root, rel)
        z = zipfile.ZipFile(p)
        size = Image.open(io.BytesIO(z.read("thumb.png"))).size
        img, c = pick(z.read("thumb.mp4"), size)
        if img is None:
            print("건너뜀:", rel); z.close(); continue
        buf = io.BytesIO(); img.save(buf, "PNG")
        tmp = p + ".tmp"
        with zipfile.ZipFile(tmp, "w") as out:
            for item in z.infolist():
                out.writestr(item, buf.getvalue() if item.filename.lower() == "thumb.png" else z.read(item.filename))
        z.close()
        os.replace(tmp, p)
        print(f"다시 고름: {rel} (내용 {c*100:.1f}%)")
