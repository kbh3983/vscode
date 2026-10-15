"""숏폼 에이전트 — 숏폼 대사 자막을 srt로 (자막 트랙용, 핵심어 노랑 <font color="#FCE001">)
  python make_srt.py <shorts.json> <out 폴더>  → <out>/<숏폼 이름>_자막.srt (UTF-8 BOM)
프리미어 자막 트랙은 한 번에 하나만 보이므로 상단 제목은 자막 트랙이 아니라 템플릿(숏폼_상단제목_AE.mogrt)으로 넣는다 (to_text.jsx)
"""
import json, os, sys

def tc(t):
    ms = round(t * 1000); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def line(text, key):
    if key and key in text:
        a, b = text.split(key, 1); return f'{a}<font color="#FCE001">{key}</font>{b}'
    return text

if __name__ == "__main__":
    S = json.load(open(sys.argv[1], encoding="utf-8")); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
    for s in S:
        U = s["subs"]; cues = []
        for i, sb in enumerate(U):
            e = sb["e"] - 0.02   # 끝을 0.02초 당김 — 다음 자막과 붙어 있으면 자막 트랙에서 겹침
            cues.append(f"{i + 1}\n{tc(sb['s'])} --> {tc(e)}\n{line(sb['text'], sb['key'])}\n")
        open(os.path.join(out, f"{s['name']}_자막.srt"), "w", encoding="utf-8-sig", newline="\r\n").write("\n".join(cues))
        print(s["name"], len(cues))
