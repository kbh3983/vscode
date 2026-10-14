"""그래픽 템플릿(.mogrt) 안의 미리보기 이미지(thumb.png)가 비어 있으면,
같이 들어 있는 미리보기 영상(thumb.mp4)에서 가장 내용이 많은 프레임을 골라 바꿔 넣는다.
사용: python thumbfix.py scan|fix <템플릿 루트> [백업 폴더]
"""
import io, os, subprocess, sys, tempfile, zipfile, shutil
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
mode, root = sys.argv[1], sys.argv[2]
backup = sys.argv[3] if len(sys.argv) > 3 else None


def content(img):
    """보이는 내용의 양: 투명이면 알파, 아니면 밝기 기준으로 '거의 검정·투명이 아닌' 픽셀 비율"""
    a = np.asarray(img.convert("RGBA")).astype(int)
    vis = (a[..., 3] > 20) & (a[..., :3].max(-1) > 24)
    return vis.mean()


def best_frame(mp4_bytes, size):
    with tempfile.TemporaryDirectory() as td:
        src = os.path.join(td, "t.mp4")
        open(src, "wb").write(mp4_bytes)
        subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", "fps=10", os.path.join(td, "f%03d.png")], check=True)
        best, score = None, -1
        files = sorted(f for f in os.listdir(td) if f.endswith(".png"))
        for f in files:
            im = Image.open(os.path.join(td, f)).convert("RGB")
            s = content(im)
            # 같은 양이면 뒤쪽(다 나타난 뒤) 프레임을 고른다
            if s >= score * 0.98:
                best, score = im.copy(), max(s, score)
        return best.resize(size, Image.LANCZOS) if best else None, score


rows = []
for dp, dn, fn in os.walk(root):
    for f in fn:
        if not f.lower().endswith(".mogrt"):
            continue
        p = os.path.join(dp, f)
        try:
            z = zipfile.ZipFile(p)
            names = z.namelist()
            thumb = next((n for n in names if n.lower() == "thumb.png"), None)
            mp4 = next((n for n in names if n.lower() == "thumb.mp4"), None)
            if not thumb:
                rows.append((p, "썸네일 없음", None)); continue
            img = Image.open(io.BytesIO(z.read(thumb)))
            c = content(img)
            rows.append((p, "비어 있음" if c < 0.003 else "정상", (c, img.size, mp4)))
            z.close()
        except Exception as e:
            rows.append((p, "읽기 실패: " + str(e), None))

for p, st, info in rows:
    print(f"{st:6s} | {os.path.relpath(p, root)}" + (f" | 내용 {info[0]*100:.2f}% | 영상 {'있음' if info[2] else '없음'}" if info else ""))

if mode != "fix":
    sys.exit()

print("\n--- 바꾸기 ---")
for p, st, info in rows:
    if st != "비어 있음":
        continue
    c, size, mp4 = info
    rel = os.path.relpath(p, root)
    if not mp4:
        print("건너뜀(미리보기 영상 없음):", rel); continue
    z = zipfile.ZipFile(p)
    img, score = best_frame(z.read(mp4), size)
    if img is None or score < 0.003 or score < c * 2:
        print("건너뜀(영상에도 내용 없음):", rel); z.close(); continue
    # 백업
    bp = os.path.join(backup, rel)
    os.makedirs(os.path.dirname(bp), exist_ok=True)
    if not os.path.exists(bp):
        shutil.copy2(p, bp)
    # 새 zip: thumb.png만 바꾸고 나머지는 그대로
    buf = io.BytesIO(); img.save(buf, "PNG")
    tmp = p + ".tmp"
    with zipfile.ZipFile(tmp, "w") as out:
        for item in z.infolist():
            data = buf.getvalue() if item.filename.lower() == "thumb.png" else z.read(item.filename)
            out.writestr(item, data)
    z.close()
    os.replace(tmp, p)
    print(f"바꿈: {rel}  (내용 {score*100:.1f}%)")
