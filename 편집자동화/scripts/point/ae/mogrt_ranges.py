"""mogrt 슬라이더 범위 넓히기 (finish_mogrt.py·fix_slider_range.py 공용)
  설치된 템플릿 고치기: python -I -X utf8 mogrt_ranges.py <백업 폴더> <mogrt 경로...>
  - 이미 시퀀스에 올라간 클립은 그대로 → 새로 넣어야 반영
"""
import json, os, shutil, sys, zipfile


def fix_ranges(d):
    """2026-10-17: AE 슬라이더는 mogrt에 min 0·max 100으로 들어가 프리미어가 값을 잘라 씀
    (창 폭 1480→100, 자간 -10→0, 행간 120%→100%) → 슬라이더 범위를 기본값에 맞게 넓힘"""
    for c in d.get("clientControls", []):
        if c.get("type") != 2 or "max" not in c: continue
        nm = "".join(s.get("str", "") for s in c.get("uiName", {}).get("strDB", []))
        v = c.get("value", 0); v = v[0] if isinstance(v, list) else v
        if "자간" in nm: c["min"], c["max"] = -500, 1500
        elif "행간" in nm: c["min"], c["max"] = 30, 400
        elif "(초)" in nm: c["min"], c["max"] = 0, 10
        elif "띄움 간격" in nm: c["min"], c["max"] = 0, 1800   # 2026-10-18 장영란 띄워 쓰기 (기본 488)
        elif "간격" in nm: c["min"], c["max"] = -300, 300   # 2026-10-18 개념카드 라벨·뜻 간격 (기본 0, − = 가깝게)
        elif "여백" in nm: c["min"], c["max"] = 0, 200
        elif "크기(%)" in nm or "늘림" in nm: c["min"], c["max"] = 0, 500
        elif "(%)" in nm: pass
        else:
            c["min"] = min(c.get("min", 0), -abs(v) * 3 if v < 0 else c.get("min", 0))
            c["max"] = max(c["max"], int(abs(v) * 3) if abs(v) > 30 else c["max"])
    # 프리미어는 sourceInfoLocalized…capsuleparams.capParams 의 capPropMin·capPropMax 를 읽음 (폰트 수정 허용과 같은 구조) → 여기도 맞춤
    rng = {c["id"]: (c["min"], c["max"]) for c in d.get("clientControls", []) if c.get("type") == 2 and "max" in c}
    def walk(o):
        if isinstance(o, dict):
            if o.get("capPropMatchName") in rng and "capPropMax" in o:
                o["capPropMin"], o["capPropMax"] = rng[o["capPropMatchName"]]
            for x in o.values(): walk(x)
        elif isinstance(o, list):
            for x in o: walk(x)
    walk(d)


if __name__ == "__main__":
    bak = sys.argv[1]; os.makedirs(bak, exist_ok=True)
    for m in sys.argv[2:]:
        shutil.copy2(m, os.path.join(bak, os.path.basename(m)))
        tmp = m + ".tmp"
        with zipfile.ZipFile(m) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zo:
            for it in zin.infolist():
                b = zin.read(it.filename)
                if it.filename == "definition.json":
                    d = json.loads(b); fix_ranges(d); b = json.dumps(d, ensure_ascii=False).encode("utf-8")
                zo.writestr(it, b)
        os.replace(tmp, m); print("고침", os.path.basename(m))
