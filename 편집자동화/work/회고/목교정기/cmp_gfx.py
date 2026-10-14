import json, sys
sys.stdout.reconfigure(encoding="utf-8")
C = json.load(open("color.json", encoding="utf-8")); F = json.load(open("final.json", encoding="utf-8"))
M = [m for m in json.load(open("timemap.json", encoding="utf-8")) if m["cs"] is not None]
def f2c(t):
    for m in M:
        if m["fs"] <= t < m["fe"]: return m["cs"] + t - m["fs"]
    for m in M:
        if m["fs"] > t: return m["cs"] - (m["fs"] - t)
    return t
def fmt(t): return f"{int(t//60)}:{t%60:05.2f}"
def mo(c):
    for x in c["c"]:
        if x["m"] == "AE.ADBE Motion":
            d = {p[1]: p[2] for p in x["p"]}; return f"{d.get('비율 조정')}% {d.get('위치')}"
    return ""
rows = []
for vi in range(2, 8):
    for c in C["video"][vi]["clips"]: rows.append((c["s"], "color", vi + 1, c["s"], c["e"] - c["s"], c["name"], mo(c)))
for vi in range(2, len(F["video"])):
    for c in F["video"][vi]["clips"]:
        ct = f2c(c["s"]); rows.append((ct, "FINAL", vi + 1, c["s"], c["e"] - c["s"], c["name"], mo(c)))
rows.sort(key=lambda r: (round(r[0], 0), r[1]))
for r in rows:
    print(f"{fmt(r[0]):>8} {r[1]:5} V{r[2]:<2} @{fmt(r[3]):>8} {r[4]:5.2f}s {r[5][:28]:28} {r[6]}")
