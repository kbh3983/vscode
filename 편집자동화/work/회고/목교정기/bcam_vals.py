import json, sys, collections
sys.stdout.reconfigure(encoding="utf-8")
C = json.load(open("color.json", encoding="utf-8")); F = json.load(open("final.json", encoding="utf-8"))
K = ["온도", "색조", "노출", "대비", "밝은 영역", "어두운 영역", "흰색", "검정", "채도"]
def lum(c):
    for x in c["c"]:
        if "Lumetri" in x["m"]:
            d = {}
            for p in x["p"]:
                if p[1] in K and p[1] not in d and isinstance(p[2], (int, float)) and not isinstance(p[2], bool): d[p[1]] = round(p[2], 2)
            return d
    return None
def fmt(t): return f"{int(t//60)}:{t%60:05.2f}"
def visible_b(d):
    v2 = d["video"][1]["clips"]
    out = []
    for c in d["video"][0]["clips"]:
        if c["name"].startswith("롱폼"): continue
        # 위 V2가 꺼진 곳과 겹치면 보임
        vis = sum(max(0, min(c["e"], o["e"]) - max(c["s"], o["s"])) for o in v2 if o["off"])
        if vis > 0.1: out.append((c, vis))
    return out
for lab, d in (("내 색보정", C), ("최종본", F)):
    vb = visible_b(d)
    print(f"== {lab}: 보이는 B캠 {len(vb)}클립 {sum(v for _, v in vb):.1f}초")
    cnt = collections.Counter()
    for c, v in vb:
        L = lum(c); key = tuple((k, L.get(k)) for k in K if L and L.get(k) not in (None, 0, 100)) if L else ("없음",)
        cnt[key] += v
    for k, v in cnt.most_common(12): print(f"   {v:5.1f}s", dict(k) if k != ("없음",) else "Lumetri 없음")
# A캠 값
for lab, d in (("내 색보정", C), ("최종본", F)):
    cnt = collections.Counter()
    for c in d["video"][1]["clips"]:
        if c["off"]: continue
        L = lum(c); cnt[tuple(sorted(L.items())) if L else ()] += c["e"] - c["s"]
    print(f"== {lab} A캠(켜진 것) 값 종류 {len(cnt)}", [ (round(v,1), dict(k)) for k, v in cnt.most_common(3)])
