"""설치된 그래픽 템플릿 전체에 rename_names.json의 표시 이름을 넣기 (2026-10-18, 보류 33 이름 정리)

사용: python scripts/point/ae/apply_names.py <백업 폴더>
- "내 템플릿" 폴더의 .mogrt 중 rename_names.json에 있는 것만 고친다 (키 = 파일 이름, .mogrt 없이)
- definition.json의 capsuleName과 capsuleNameLocalized(ko_KR·en_US)만 바꾸고 나머지는 그대로
  한국어 프리미어는 capsuleNameLocalized를 보여 줌 (playbook_AE변환 17장)
- 파일 이름은 그대로 (포인트 에이전트 등 스크립트가 파일 이름으로 찾음)
- 고치기 전에 원본을 <백업 폴더>에 복사
"""
import json, os, shutil, sys, zipfile

backup = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
names = json.load(open(os.path.join(here, "rename_names.json"), encoding="utf-8"))
mt = os.path.join(os.environ["APPDATA"], "Adobe", "Common", "Motion Graphics Templates")
os.makedirs(backup, exist_ok=True)

done = same = 0
for f in sorted(os.listdir(mt)):
    key = f[:-6]
    if not f.endswith(".mogrt") or key not in names:
        continue
    new = names[key]
    path = os.path.join(mt, f)
    if not os.path.exists(os.path.join(backup, f)):
        shutil.copy2(path, os.path.join(backup, f))
    tmp = path + ".tmp"
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        changed = False
        for it in zin.infolist():
            b = zin.read(it.filename)
            if it.filename == "definition.json":
                d = json.loads(b.decode("utf-8-sig"))
                loc = d.get("capsuleNameLocalized") or {}
                db = [e for e in loc.get("strDB", []) if e.get("localeString") not in ("ko_KR", "en_US")]
                db += [{"localeString": "ko_KR", "str": new}, {"localeString": "en_US", "str": new}]
                if d.get("capsuleName") != new or loc.get("strDB") != db:
                    changed = True
                d["capsuleName"] = new
                loc["strDB"] = db
                d["capsuleNameLocalized"] = loc
                b = json.dumps(d, ensure_ascii=False).encode("utf-8")
            zout.writestr(it, b)
    if changed:
        os.replace(tmp, path)
        done += 1
    else:
        os.remove(tmp)
        same += 1
print("바꿈", done, "이미 같음", same, "이름표에 없음", sum(1 for f in os.listdir(mt) if f.endswith(".mogrt") and f[:-6] not in names))
