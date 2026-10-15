"""프리미어 프로젝트(.prproj)에서 시퀀스의 자막(캡션) 트랙 내용 읽기 — 스크립트 API로는 자막을 읽을 수 없어 파일을 직접 푼다 (2026-10-16)
  python read_captions.py <prproj> <시퀀스 ID> <out.json>
  → [{track, items:[{s, e, text}]}]  (s/e 초, text = FlatBuffers 안 UTF-8 문구 중 가장 긴 것)
"""
import base64, gzip, json, re, sys

TICK = 254016000000
src, sid, out = sys.argv[1:4]
d = gzip.open(src).read().decode("utf-8", "ignore")
idx = {m.group(3): (m.group(1), m.start() + 1) for m in re.finditer(r'\n\t<(\w+) Object(ID|UID)="([^"]+)"', d)}
def block(k):
    tag, s = idx[k]; return d[s:d.find("\n\t</" + tag + ">", s)]
def text_of(b64):
    raw = base64.b64decode(b64); best = ""
    for m in re.finditer(rb"(?:[\xea-\xed][\x80-\xbf]{2}|[\x20-\x7e])+", raw):
        try: t = m.group(0).decode("utf-8")
        except Exception: continue
        if re.search(r"[가-힣]", t) and len(t) > len(best): best = t
    if not best:
        for m in re.finditer(rb"(?:[\xc0-\xf4][\x80-\xbf]+|[\x20-\x7e]){2,}", raw):
            t = m.group(0).decode("utf-8", "ignore")
            if len(t) > len(best) and not t.startswith("Paperlogy") and not t.startswith("Pretendard"): best = t
    return best.strip()
seq = block(sid)
groups = re.findall(r'<Second ObjectRef="(\d+)"/>', seq)
R = []
for g in groups:
    if idx[g][0] != "DataTrackGroup": continue
    for tn, tr in enumerate(re.findall(r'Track Index="\d+" ObjectURef="([^"]+)"', block(g))):
        items = []
        for ref in re.findall(r'TrackItem Index="\d+" ObjectRef="(\d+)"', block(tr)):
            b = block(ref)
            st = re.search(r"<Start>(\d+)</Start>", b); en = re.search(r"<End>(\d+)</End>", b)
            bv = re.search(r'BlockVectorItem Index="0" ObjectRef="(\d+)"', b)
            tx = ""
            if bv:
                m = re.search(r"<FormattedTextData Encoding=\"base64\"[^>]*>([^<]+)<", block(bv.group(1)))
                if m: tx = text_of(m.group(1).strip())
            items.append(dict(s=round(int(st.group(1)) / TICK, 3) if st else 0.0, e=round(int(en.group(1)) / TICK, 3) if en else None, text=tx))
        R.append(dict(track=tn + 1, items=items))
json.dump(R, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
for t in R: print("트랙", t["track"], len(t["items"]))
