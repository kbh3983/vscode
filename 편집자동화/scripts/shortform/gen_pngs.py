"""숏폼 에이전트 — 숏폼마다 상단 제목·자막 png 만들기 (make_assets.py 사용)
  python gen_pngs.py <shorts.json> <out 폴더>  → <out>/<숏폼 이름>/title.png, sub_000.png … , shorts.json 에 파일 경로 기록
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from make_assets import title, sub

S = json.load(open(sys.argv[1], encoding="utf-8")); out = sys.argv[2]
for s in S:
    d = os.path.join(out, s["name"]); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, "title.png"); title(*s["title"]).save(p); s["title_png"] = os.path.abspath(p)
    for i, sb in enumerate(s["subs"]):
        p = os.path.join(d, f"sub_{i:03d}.png"); sub(sb["text"], sb["key"]).save(p); sb["png"] = os.path.abspath(p)
    print(s["name"], "제목 1 + 자막", len(s["subs"]))
json.dump(S, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
