"""새로 내보낸 그래픽 템플릿(.mogrt)의 미리보기 이미지를 렌더 영상의 정지 프레임으로 바꾼다.
AE는 미리보기를 0프레임으로 만들어서, 글자가 아직 안 나타난 자막 템플릿은 빈 화면이 된다.
사용: python set_thumb.py <템플릿.mogrt> <렌더 영상.mp4> <프레임 번호>
  프레임 번호는 글자가 다 나타나 멈춘 시점 (잔상·퇴장 전)
"""
import io, os, subprocess, sys, tempfile, zipfile
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
mogrt, mp4, n = sys.argv[1], sys.argv[2], int(sys.argv[3])

with tempfile.TemporaryDirectory() as td:
    png = os.path.join(td, "f.png")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-vf", f"select=eq(n\\,{n})",
                    "-frames:v", "1", "-fps_mode", "passthrough", png], check=True)
    z = zipfile.ZipFile(mogrt)
    size = Image.open(io.BytesIO(z.read("thumb.png"))).size
    buf = io.BytesIO()
    Image.open(png).convert("RGB").resize(size, Image.LANCZOS).save(buf, "PNG")
    tmp = mogrt + ".tmp"
    with zipfile.ZipFile(tmp, "w") as out:
        for it in z.infolist():
            out.writestr(it, buf.getvalue() if it.filename.lower() == "thumb.png" else z.read(it.filename))
    z.close()
    os.replace(tmp, mogrt)
print("미리보기 바꿈:", os.path.basename(mogrt), "←", os.path.basename(mp4), "프레임", n)
