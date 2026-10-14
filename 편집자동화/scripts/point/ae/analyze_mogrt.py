"""프리미어 템플릿(.mogrt, prgraphic) 풀어서 분석 (포인트 에이전트 — playbook_AE변환.md 1)

사용: python scripts/point/ae/analyze_mogrt.py "<원본 템플릿 이름(.mogrt 없이)>" <작업 폴더 이름>
- work/포인트/ae_templates/<작업 폴더>/ 에 definition.json, thumb, inner.prproj.xml 저장 (원본 파일은 읽기만)
- 길이·화면 크기, 클립 효과와 값, 키프레임(초), 텍스트 블롭 안의 문자열(폰트 이름 등) 출력
"""
import base64, gzip, io, json, os, re, sys, zipfile

TICKS = 254016000000
name, folder = sys.argv[1:3]
src = os.path.join(os.environ["APPDATA"], "Adobe", "Common", "Motion Graphics Templates", name + ".mogrt")
out = os.path.join("work", "포인트", "ae_templates", folder)
os.makedirs(out, exist_ok=True)
z = zipfile.ZipFile(src)
for n in z.namelist():
    if n in ("definition.json", "thumb.png", "thumb.mp4"):
        open(os.path.join(out, n), "wb").write(z.read(n))
inner = zipfile.ZipFile(io.BytesIO(z.read("project.prgraphic")))
xml = gzip.decompress(inner.read(inner.namelist()[0])).decode("utf-8", "ignore")
open(os.path.join(out, "inner.prproj.xml"), "w", encoding="utf-8").write(xml)

d = json.load(open(os.path.join(out, "definition.json"), encoding="utf-8"))
si = d["sourceInfoLocalized"][list(d["sourceInfoLocalized"])[0]]
dur = si["duration"]["value"] / si["duration"]["scale"]
print("길이", round(dur, 3), "초, 크기", si["framesize"]["size"], ", 문구 칸", [c["uiName"]["strDB"][0]["str"] for c in d["clientControls"]])

# 효과 이름과 그 아래 파라미터 이름·값 (Component → Param)
for m in re.finditer(r"<DisplayName>([^<]+)</DisplayName>", xml):
    pass
comps = re.findall(r"<Component[^>]*>.*?</Component>", xml, re.S)
for c in comps:
    dn = re.search(r"<DisplayName>([^<]*)</DisplayName>", c)
    print("효과:", dn.group(1) if dn else "?")
params = re.findall(r"<(\w*ComponentParam)[^>]*ObjectID=\"(\d+)\"[^>]*>(.*?)</\1>", xml, re.S)
for tag, oid, body in params:
    nm = re.search(r"<Name>([^<]*)</Name>", body)
    sk = re.search(r"<StartKeyframe>([^<]*)</StartKeyframe>", body)
    kf = re.search(r"<Keyframes>([^<]*)</Keyframes>", body)
    val = sk.group(1).split(",")[1] if sk and "," in sk.group(1) else ""
    line = f"  {nm.group(1) if nm else '?'} = {val[:40]}"
    if kf:
        ks = [k.split(",") for k in kf.group(1).strip(";").split(";")]
        t0 = int(ks[0][0])
        line += "  키: " + ", ".join(f"{(int(k[0]) - t0) / TICKS:.3f}s→{k[1]}" for k in ks)
    print(line)
for v in re.findall(r"<StartKeyframeValue[^>]*>([^<]+)<", xml):
    v = v.strip()
    if len(v) > 200 and re.fullmatch(r"[A-Za-z0-9+/=]+", v):
        raw = base64.b64decode(v + "=" * (-len(v) % 4))
        s = [x.decode() for x in re.findall(rb"[\x20-\x7e]{5,}", raw)]
        ko = re.findall(r"[가-힣][가-힣 ,!?.~]{1,}", raw.decode("utf-8", "ignore"))
        print("텍스트 블롭", len(raw), "바이트:", s[:6], ko[:3])
