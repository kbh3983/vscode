"""설치된 .mogrt의 글자 칸 폰트·크기·스타일 수정 허용을 켜기 (다시 내보내지 않고 definition.json만 고침)
  python -I -X utf8 allow_font_edit.py <백업 폴더> <mogrt 경로...>
- 프리미어는 clientControls.fonteditinfo 뿐 아니라 sourceInfoLocalized…capsuleparams.capParams 쪽 capPropFontEdit 값도 읽음
  → 2026-10-17 전 finish_mogrt.py는 앞쪽만 켜서 실제로는 수정이 막혀 있었음 (교양 테스트영상 피드백)
- 미리보기(thumb)·나머지 파일은 그대로. 고치기 전 원본을 백업 폴더에 복사
- 이미 시퀀스에 올라간 클립은 그대로 (클립마다 값을 따로 가짐) → 새로 넣거나 템플릿 바꾸기
"""
import json, os, shutil, sys, zipfile

bak = sys.argv[1]; os.makedirs(bak, exist_ok=True)
def allow(o):
    n = 0
    if isinstance(o, dict):
        if "capPropFontEdit" in o:
            if not (o["capPropFontEdit"] and o.get("capPropFontSizeEdit") and o.get("capPropFontFauxStyleEdit")): n += 1
            o["capPropFontEdit"] = o["capPropFontFauxStyleEdit"] = o["capPropFontSizeEdit"] = True
        for v in o.values(): n += allow(v)
    elif isinstance(o, list):
        for v in o: n += allow(v)
    return n
for p in sys.argv[2:]:
    with zipfile.ZipFile(p) as z: d = json.loads(z.read("definition.json")); items = [(i, z.read(i.filename)) for i in z.infolist()]
    n = allow(d)
    if not n: print("그대로", os.path.basename(p)); continue
    shutil.copy2(p, os.path.join(bak, os.path.basename(p)))
    tmp = p + ".tmp"
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zo:
        for it, b in items:
            if it.filename == "definition.json": b = json.dumps(d, ensure_ascii=False).encode("utf-8")
            zo.writestr(it, b)
    os.replace(tmp, p); print("켬", n, "칸", os.path.basename(p))
