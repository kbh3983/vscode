"""batch.py match 결과에서 검정 차이가 큰 조각(화면 구성 차이)은 검정을 처음 값으로 되돌림
python fixblack.py <itN.txt> <itN_next.json> <base -8> <한계 12>"""
import json, re, sys
txt, nxt, base, lim = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
v = json.load(open(nxt, encoding="utf-8")); n = 0
for line in open(txt, encoding="utf-8"):
    m = re.match(r"V1\[\s*(\d+)\].*검정 (\d+)/(\d+)", line)
    if m and abs(int(m.group(2)) - int(m.group(3))) > lim:
        v[m.group(1)]["24"] = base; n += 1
json.dump(v, open(nxt, "w", encoding="utf-8"), indent=1)
print("검정 처음 값으로:", n)
