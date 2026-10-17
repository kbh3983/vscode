"""AE에서 내보낸 .mogrt를 "내 템플릿" 폴더로 옮기고 설정 고치기 (포인트 에이전트)

사용: python scripts/point/ae/finish_mogrt.py <export 폴더> <최종 파일 이름(.mogrt 없이)> <표시 이름> [렌더 mp4 정지 프레임]
- AE의 exportAsMotionGraphicsTemplate는 경로를 폴더로 써서 "제목 없음.mogrt"가 생김 → 이름 바꿔 옮김
- definition.json: capsuleName = 표시 이름, 텍스트 칸 폰트·크기 변경 허용 (스크립트로 페이퍼로지 적용하려고)
- 새로 만든 _AE 파일만 덮어쓴다. 원본 템플릿은 건드리지 않는다
- [렌더 mp4 정지 프레임]을 주면 미리보기(thumb.png)를 그 프레임으로 바꾼다 (2026-10-13)
  AE는 미리보기를 0프레임으로 만들어, 등장 애니메이션이 있는 자막은 기본 그래픽 패널에서 빈 화면으로 보임
  정지 프레임 = 글자가 다 나타나 멈춘 시점 (잔상·퇴장 전). 렌더는 aerender -rqindex로
"""
import glob, json, os, sys, zipfile

src_dir, name, display = sys.argv[1:4]
thumb = None
if len(sys.argv) > 5:
    import subprocess, tempfile
    from PIL import Image
    td = tempfile.mkdtemp()
    png = os.path.join(td, "f.png")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", sys.argv[4], "-vf", f"select=eq(n\\,{int(sys.argv[5])})",
                    "-frames:v", "1", "-fps_mode", "passthrough", png], check=True)
    thumb = Image.open(png).convert("RGB")
assert name.endswith("_AE"), "원본 템플릿을 덮어쓰지 않도록 _AE 이름만 허용"
src = max(glob.glob(os.path.join(src_dir, "*.mogrt")), key=os.path.getmtime)
dst = os.path.join(os.environ["APPDATA"], "Adobe", "Common", "Motion Graphics Templates", name + ".mogrt")
tmp = dst + ".tmp"
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
    for it in zin.infolist():
        b = zin.read(it.filename)
        if it.filename == "definition.json":
            d = json.loads(b)
            d["capsuleName"] = display
            for c in d.get("clientControls", []):
                fe = c.get("fonteditinfo")
                if fe:
                    fe["capPropFontEdit"] = fe["capPropFontFauxStyleEdit"] = fe["capPropFontSizeEdit"] = True
            # 2026-10-17: 프리미어는 sourceInfoLocalized…capsuleparams.capParams 쪽 값을 읽음 → 여기도 켜야 실제로 폰트·크기 수정 가능 (교양 테스트영상 피드백)
            def allow(o):
                if isinstance(o, dict):
                    if "capPropFontEdit" in o: o["capPropFontEdit"] = o["capPropFontFauxStyleEdit"] = o["capPropFontSizeEdit"] = True
                    for v in o.values(): allow(v)
                elif isinstance(o, list):
                    for v in o: allow(v)
            allow(d)
            b = json.dumps(d, ensure_ascii=False).encode("utf-8")
        elif it.filename.lower() == "thumb.png" and thumb is not None:
            import io
            size = Image.open(io.BytesIO(b)).size
            buf = io.BytesIO()
            thumb.resize(size, Image.LANCZOS).save(buf, "PNG")
            b = buf.getvalue()
        zout.writestr(it, b)
os.replace(tmp, dst)
os.remove(src)
print("->", dst)
