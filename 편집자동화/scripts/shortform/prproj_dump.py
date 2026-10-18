"""프리미어 프로젝트(.prproj, gzip XML)에서 시퀀스의 트랙·클립을 읽어 JSON으로 (프리미어를 열지 않고 비교용) (2026-10-18)
사용자: "니가 작업해준 숏폼 _엔딩 시퀀스 내가 최종 작업한 거야. 니가 작업해준 거랑 어떤 차이가 있는지 분석해줘."
  python -I prproj_dump.py <프로젝트.prproj 또는 풀어 둔 .xml> <출력.json> "<시퀀스 이름 정규식>"
- 시퀀스 → 트랙 그룹(영상·오디오·자막) → 트랙 → 클립: 시작·끝(초), 소스 in·out, 이름, 효과 이름, 키프레임 있는 속성 수
- prproj는 객체가 맨 위에 평평하게 놓이고 ObjectID / ObjectUID 로 서로 가리킨다 (ObjectRef / ObjectURef)
"""
import gzip, json, re, sys
import xml.etree.ElementTree as ET

TICK = 254016000000
src, out, pat = sys.argv[1], sys.argv[2], re.compile(sys.argv[3])
raw = open(src, "rb").read()
if raw[:2] == b"\x1f\x8b": raw = gzip.decompress(raw)
root = ET.fromstring(raw)
byid, byuid = {}, {}
for el in root:
    if "ObjectID" in el.attrib: byid[el.attrib["ObjectID"]] = el
    if "ObjectUID" in el.attrib: byuid[el.attrib["ObjectUID"]] = el


def ref(e):
    if e is None: return None
    if "ObjectRef" in e.attrib: return byid.get(e.attrib["ObjectRef"])
    if "ObjectURef" in e.attrib: return byuid.get(e.attrib["ObjectURef"])
    return None


def txt(e, path, default=None):
    x = e.find(path) if e is not None else None
    return x.text if x is not None and x.text is not None else default


def sec(v):
    return round(int(v) / TICK, 3) if v not in (None, "") else None


def components(item):
    """효과 목록: (이름, 키프레임 있는 속성 수)"""
    res = []
    co = item.find(".//ComponentOwner/Components")
    chain = ref(co)
    if chain is None: return res
    for c in chain.iter("Component"):
        comp = ref(c)
        if comp is None: continue
        name = txt(comp, ".//DisplayName") or txt(comp, ".//MatchName") or comp.tag
        keys = 0
        for p in comp.iter("Param"):
            pe = ref(p)
            if pe is not None and pe.find(".//Keyframes") is not None and (pe.find(".//Keyframes").text or "").count(",") > 2:
                keys += 1
        res.append([name, keys])
    return res


def clip_info(ti):
    tr = ti.find(".//TrackItem")
    start, end = sec(txt(tr, "Start")), sec(txt(tr, "End"))
    sub = ref(ti.find(".//SubClip"))
    name = txt(sub, "Name", "")
    clip = ref(sub.find("Clip")) if sub is not None else None
    cin = sec(txt(clip, ".//InPoint")) if clip is not None else None
    cout = sec(txt(clip, ".//OutPoint")) if clip is not None else None
    disabled = txt(clip, ".//Clip/IsEnabled") == "false" if clip is not None else False
    r = {"name": name, "s": start, "e": end, "in": cin, "out": cout, "off": disabled, "fx": components(ti)}
    texts = []   # 자막 글자: CaptionDataClipTrackItem → BlockVector → Block 의 FormattedTextData(base64 flatbuffer) 속 UTF-8 문자열
    for bv in ti.iter("BlockVectorItem"):
        b = ref(bv)
        ft = b.find("FormattedTextData") if b is not None else None
        if ft is not None and ft.text:
            import base64, struct
            raw_b = base64.b64decode(ft.text.strip())
            for m in re.finditer(rb"(?s)(.{4})((?:[\xea-\xed][\x80-\xbf]{2}|[\x20-\x7e]|\n){2,})", raw_b):
                ln = struct.unpack("<I", m.group(1))[0]
                s_ = m.group(2)
                if ln and ln <= len(s_) + 2 and not s_.startswith(b"Paperlogy") and re.search(rb"[\xea-\xed]|[0-9A-Za-z]", s_[:ln]):
                    texts.append(s_[:ln].decode("utf-8", "ignore"))
    if texts: r["text"] = " / ".join(t for t in texts if not re.match(r"^[A-Za-z]+-\w+$", t))
    return r


seqs = {}
for el in root:
    if el.tag != "Sequence": continue
    nm = txt(el, "Name", "")
    if not pat.search(nm): continue
    groups = []
    for tg in el.iter("TrackGroup"):
        g = ref(tg.find("Second"))
        if g is None: continue
        kind = g.tag.replace("TrackGroup", "")
        tracks = []
        for t in g.iter("Track"):
            te = ref(t)
            if te is None: continue
            items = [ref(x) for x in te.iter("TrackItem") if "ObjectRef" in x.attrib or "ObjectURef" in x.attrib]
            clips = [clip_info(x) for x in items if x is not None]
            tname = txt(te, ".//Track/Name", "") or ""
            muted = txt(te, ".//IsMuted") == "true"
            tracks.append({"name": tname, "muted": muted, "clips": sorted(clips, key=lambda c: c["s"] or 0)})
        groups.append({"kind": kind, "tracks": tracks})
    seqs[nm] = groups
json.dump(seqs, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("시퀀스", len(seqs), "->", out)
