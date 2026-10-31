"""설치된 .mogrt 슬라이더 칸의 최대값 바꾸기 (다시 내보내지 않고 definition.json만 고침, 2026-10-29)
  python -I -X utf8 set_mogrt_max.py <백업 폴더> <칸 이름에 들어간 말> <최대값> <mogrt 경로...>
  예: set_mogrt_max.py work/놀심/템플릿/mogrt_백업1029 "크기(%)" 300 놀심_B2_붓글씨2줄_AE.mogrt
- 사용자: "2줄 크기가 최대가 100이라 더 키울 수가 없네" — AE 슬라이더 기본 범위(0~100)가 그대로 들어감
- 프리미어는 clientControls[].max 와 sourceInfoLocalized.<언어>.capsuleparams.capParams[].capPropMax 둘 다 읽음
  (allow_font_edit.py와 같은 이유로 두 곳을 같이 고침, 칸은 id = capPropMatchName으로 짝)
- 이미 시퀀스에 올라간 클립은 예전 범위 그대로 → 새로 넣어야 함
"""
import json, os, shutil, sys, zipfile

bak, key, mx = sys.argv[1], sys.argv[2], float(sys.argv[3])
os.makedirs(bak, exist_ok=True)

def names(c):
    u = c.get("uiName", {})
    return [s.get("str", "") for s in u.get("strDB", [])] if isinstance(u, dict) else [str(u)]

for p in sys.argv[4:]:
    with zipfile.ZipFile(p) as z:
        d = json.loads(z.read("definition.json")); items = [(i, z.read(i.filename)) for i in z.infolist()]
    ids = {c["id"] for c in d.get("clientControls", []) if "max" in c and any(key in n for n in names(c))}
    n = 0
    for c in d.get("clientControls", []):
        if c.get("id") in ids: c["max"] = mx; n += 1
    for loc in d.get("sourceInfoLocalized", {}).values():
        for cp in loc.get("capsuleparams", {}).get("capParams", []):
            if cp.get("capPropMatchName") in ids and "capPropMax" in cp: cp["capPropMax"] = mx; n += 1
    if not n: print("해당 칸 없음", os.path.basename(p)); continue
    shutil.copy2(p, os.path.join(bak, os.path.basename(p)))
    tmp = p + ".tmp"
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zo:
        for it, b in items:
            if it.filename == "definition.json": b = json.dumps(d, ensure_ascii=False).encode("utf-8")
            zo.writestr(it, b)
    os.replace(tmp, p); print("고침", len(ids), "칸 /", n, "곳", os.path.basename(p))
