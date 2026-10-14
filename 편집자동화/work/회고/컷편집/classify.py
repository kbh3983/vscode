"""컷편집 회고 — 90곳 분류 (사람이 읽고 붙인 유형) → 유형별 합계·에이전트 기준으로 잡히는지 (2026-10-13)"""
import json, os, sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
H = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(H, "cuts.json"), encoding="utf-8"))
# 유형: 무음(동작 대기·쉬는 구간) / 다듬기(0.5초 미만 숨·틈·경계) / 군말(한두 단어 군말·더듬) / 반복(같은 말·재시작)
#       진행(촬영·진행 멘트) / 혼선(시범 우왕좌왕) / 곁가지(PD·선정 이야기, 문답) / 자막대체(자막·그래픽이 대신 말함) / 판매(엔딩 앞 판매 멘트)
L = {}
for i in [4, 8, 20, 63, 72, 86, 89]: L[i] = "무음"
for i in [0, 1, 2, 11, 19, 26, 30, 31, 32, 33, 34, 50, 51, 57, 58, 59, 64, 65, 66, 74, 82, 83, 84, 85]: L[i] = "다듬기"
for i in [5, 7, 9, 18, 22, 27, 35, 36, 45, 47, 49, 53, 54, 60, 61, 73, 75, 77, 78, 79, 80, 81]: L[i] = "군말"
for i in [6, 15, 16, 17, 21, 23, 24, 25, 28, 29, 43, 44, 46, 48, 55, 56, 67, 68]: L[i] = "반복"
for i in [3, 12, 14, 52, 76]: L[i] = "진행"
for i in [87]: L[i] = "혼선"
for i in [37, 38, 39, 40, 41, 42, 70, 71, 88]: L[i] = "곁가지"
for i in [10, 13, 69]: L[i] = "자막대체"
for i in [62]: L[i] = "판매"
assert len(L) == len(D["cuts"]), (len(L), len(D["cuts"]), sorted(set(range(len(D["cuts"]))) - set(L)))
# 지금 컷편집 기준(C1 무음 0.7초↑·동작 구간 밖, C2 촬영 잡담, C3 NG, C4 필러, C5 더듬, C8 재시작, C9 다듬기)으로 잡히는가
COVER = {"무음": "C1 (0.7초↑, 동작 세트 밖 — 2초↑는 review)", "다듬기": "C9 일부 (숨·틈은 C1 기준 0.7초 미만이라 대부분 안 잡힘)",
         "군말": "C4·C5 일부 (필러 목록 밖 단어 많음)", "반복": "C8 일부 (문장 재시작만 — 같은 설명을 다시 하는 큰 반복은 안 잡힘)",
         "진행": "C2", "혼선": "C3 일부 (NG 판단 어려움)", "곁가지": "없음", "자막대체": "없음 (포인트 자막과 연결 필요)", "판매": "없음"}
agg = defaultdict(lambda: [0, 0.0, defaultdict(int)])
for i, x in enumerate(D["cuts"]):
    x["kind"] = L[i]; a = agg[L[i]]; a[0] += 1; a[1] += x["len"]; a[2][x["video"]] += 1
json.dump(D, open(os.path.join(H, "cuts.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
tot = sum(x["len"] for x in D["cuts"])
print(f"전체 {len(D['cuts'])}곳 {tot:.1f}초")
for k in ["무음", "다듬기", "군말", "반복", "진행", "혼선", "곁가지", "자막대체", "판매"]:
    n, s, v = agg[k]
    print(f"| {k} | {n} | {s:.1f}초 ({s / tot * 100:.0f}%) | {', '.join(f'{a} {b}' for a, b in v.items())} | {COVER[k]} |")
r = D["restored"]
print(f"되살림 {len(r)}곳 {sum(x['len'] for x in r):.2f}초, 프레임 {sorted(x['frames'] for x in r)}")
sm = [x for x in D["cuts"] if x["kind"] == "다듬기"]
print("다듬기 프레임", sorted(x["frames"] for x in sm))
