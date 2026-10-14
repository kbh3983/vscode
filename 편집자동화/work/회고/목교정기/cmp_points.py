import json, sys
sys.stdout.reconfigure(encoding="utf-8")
C = json.load(open("color.json", encoding="utf-8")); F = json.load(open("final.json", encoding="utf-8"))
M = json.load(open("timemap.json", encoding="utf-8"))
P = json.load(open("../../포인트/목교정기_종편_모노_색보정_포인트_배치.json", encoding="utf-8"))
def f2c(t):
    best = None
    for m in M:
        if m["cs"] is None: continue
        if m["fs"] - 0.05 <= t <= m["fe"] + 0.05: return m["cs"] + t - m["fs"]
    # 컷 사이: 가장 가까운 구간
    for m in M:
        if m["fs"] > t: return m["cs"] - (m["fs"] - t)
    return t
def fmt(t): return f"{int(t//60)}:{t%60:05.2f}"
def motion(c):
    for x in c["c"]:
        if x["m"] == "AE.ADBE Motion":
            d = {p[1]: p[2] for p in x["p"]}; return d.get("비율 조정"), d.get("위치")
    return None, None
def text(c):
    out = []
    for x in c["c"]:
        for p in x["p"]:
            v = p[2]
            if isinstance(v, str) and "textEditValue" in v:
                try: j = json.loads(v); out.append(j.get("textEditValue") + " [" + ",".join(j.get("fontEditValue", [])) + "]")
                except Exception: pass
    return " / ".join(out)
# 편집자 그래픽(V3~V8): color vs final 비교 — final 시간 → color 시간으로 맞춰 같은 이름·시간이 있는지
print("===== V3~V8 (편집자·사용자 그래픽) 추가/삭제")
for vi in range(2, 8):
    fc = F["video"][vi]["clips"]; cc = C["video"][vi]["clips"] if vi < len(C["video"]) else []
    for c in fc:
        ct = f2c(c["s"])
        if not any(o["name"] == c["name"] and abs(o["s"] - ct) < 0.3 for o in cc):
            sc, pos = motion(c)
            print(f"  + V{vi+1} {fmt(c['s'])} (color {fmt(ct)}) {c['e']-c['s']:.2f}s {c['name']} 비율 {sc} 위치 {pos} {text(c)}")
    for o in cc:
        if not any(c["name"] == o["name"] and abs(f2c(c["s"]) - o["s"]) < 0.3 for c in fc):
            print(f"  - V{vi+1} color {fmt(o['s'])} {o['e']-o['s']:.2f}s {o['name']}")
print("===== V9~ (포인트 트랙) 최종본에 남은 클립")
for vi in range(8, len(F["video"])):
    for c in F["video"][vi]["clips"]:
        ct = f2c(c["s"]); sc, pos = motion(c)
        pt = min(P["points"], key=lambda p: abs(p["start"] - ct))
        print(f"  V{vi+1} {fmt(c['s'])} (color {fmt(ct)}) {c['e']-c['s']:.2f}s {c['name']} 비율 {sc} 위치 {pos} | {text(c)}")
        print(f"       ← 가까운 내 구간 #{pt['n']} {fmt(pt['start'])}~{fmt(pt['end'])} [{pt['type']}] \"{pt['text']}\" 차이 {ct-pt['start']:+.2f}s 후보 {[x['template'] for x in pt['candidates']]}")
print("===== 내 구간", len(P["points"]), "후보", sum(len(p["candidates"]) for p in P["points"]))
