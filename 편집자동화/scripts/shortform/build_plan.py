"""숏폼 에이전트 S4 준비 — plan.json(구간: 롱폼 대사 시작 시간 기준) → 숏폼별 조각·자막·안내 박스·시각 장치 제안
  python build_plan.py <plan.json> <받아쓰기 폴더(t_<롱폼>.json)> <out.json>
- 조각: [첫 대사 시작, 마지막 대사 시작(, 첫 단어)] → 대사 경계에 맞춰 [시작 −0.10, 끝 +0.15] (앞뒤 대사와 겹치지 않게)
- 자막: 단어를 숏폼 시간으로 옮겨 한 줄 14자 안팎·0.35초 넘는 쉼에서 끊음, 핵심어 1개 노랑 (KEY)
- 안내 박스(criteria): 프로필 0~5초 → 단톡방 5~11초 → 플레오라 = 도구 말이 처음 나올 때부터 6초(없으면 11~17초) → 라이브 = 마지막 6초(영상 아래). 영상 안 박스가 나오는 동안 자막은 뺀다
- 시각 장치는 넣지 않고 제안만 (사용자: 목록 먼저 → 고른 것만)
"""
import json, os, re, sys

KEY = ["장요근", "둔근", "코어", "골반", "고관절", "허리", "척추", "디스크", "거북목", "등", "목", "어깨", "옆구리", "엉덩이", "힙", "허벅지", "무릎",
       "뒤꿈치", "발끝", "터틀볼", "웨이트볼", "스틱", "자극", "고립", "호흡", "견인", "교정", "중립", "근육", "복압", "30초", "10번", "5분"]
TOOL = ["터틀볼", "웨이트볼", "볼", "플레오라", "스틱"]
DEVICE = [("해부 그림", ["장요근", "근육", "척추", "요추", "디스크", "횡경막", "고관절", "둔근"]),
          ("빨간 X (틀린 자세)", ["아닙니다", "안 돼요", "하면 안", "말고", "아니라", "문제가"]),
          ("화살표 (방향)", ["밀어", "당겨", "올려", "내려", "넘겨", "들어", "뻗어", "펴"]),
          ("점선 원 (부위·도구)", ["터틀볼", "여기", "이 부분", "이쪽"]),
          ("큰 글자", ["30초", "10번", "20회", "5분", "확 달라", "장난 아닌", "완전 달라"])]

def load(p): return json.load(open(p, encoding="utf-8"))

def snap(segs, a, b, word=None):
    i = min(range(len(segs)), key=lambda k: abs(segs[k]["s"] - a)); j = min(range(len(segs)), key=lambda k: abs(segs[k]["s"] - b))
    s0 = segs[i]["s"]
    if word:
        for w in segs[i]["w"]:
            if w[2].startswith(word): s0 = w[0]; break
    st = max(s0 - 0.10, segs[i - 1]["e"] + 0.02 if i > 0 else 0)
    en = min(segs[j]["e"] + 0.15, segs[j + 1]["s"] - 0.02 if j + 1 < len(segs) else 1e9)
    words = [w for k in range(i, j + 1) for w in segs[k]["w"] if w[0] >= st - 0.01 and w[1] <= en + 0.3]
    return round(st, 3), round(en, 3), words

def chunk(words):   # 문장 끝(. ? !)·0.35초 쉼에서 먼저 끊고, 한 줄 14자 넘으면 끊음
    out, cur = [], []
    for w in words:
        n = len("".join(x[2] for x in cur))
        if cur and (re.search(r"[.?!]$", cur[-1][2]) or w[0] - cur[-1][1] > 0.35 or n + len(w[2]) > 14):
            out.append(cur); cur = []
        cur.append(w)
    if cur: out.append(cur)
    M = []   # 4자 이하로 짧게 남은 줄은 앞 줄에 붙임 (합쳐 18자 이하, 앞 줄이 문장 끝이 아닐 때)
    for c in out:
        if M and len(re.sub(r"[.?!,]", "", "".join(x[2] for x in c))) <= 5 and len("".join(x[2] for x in M[-1] + c)) <= 18 and not re.search(r"[.?!]$", M[-1][-1][2]):
            M[-1] = M[-1] + c
        else:
            M.append(c)
    return M

def clean(t): return re.sub(r"[.,]+(?=\s|$)", "", t).strip()

def build(plan, tdir):
    R = []
    for name, P in plan.items():
        segs = load(os.path.join(tdir, f"t_{name}.json"))
        for sh in P["shorts"]:
            t, pieces, subs = 0.0, [], []
            for pc in sh["pieces"]:
                a, b, words = snap(segs, pc[0], pc[1], pc[2] if len(pc) > 2 else None)
                pieces.append(dict(src_in=a, src_out=b, at=round(t, 3)))
                for ch in chunk(words):
                    s0 = t + max(ch[0][0], a) - a; s1 = t + min(ch[-1][1] + 0.12, b) - a
                    text = clean(" ".join(x[2] for x in ch))
                    key = next((k for k in KEY if k in text), "")
                    subs.append(dict(s=round(s0, 3), e=round(s1, 3), text=text, key=key))
                t += b - a
            dur = round(t, 3)
            for k in range(len(subs) - 1):          # 자막 사이 빈틈은 다음 자막 시작까지 이어서
                if subs[k + 1]["s"] - subs[k]["e"] < 0.5: subs[k]["e"] = subs[k + 1]["s"]
            tool_t = next((sb["s"] for sb in subs if any(x in sb["text"] for x in TOOL)), None)
            ple = max(11.0, tool_t) if tool_t is not None else 11.0
            if ple + 6.0 > dur - 6.0: ple = 11.0   # 도구 말이 끝부분에만 나오면 라이브 안내와 겹치지 않게 앞쪽에
            boxes = [("10_프로필.png", 0.0, 5.0), ("11_단톡방.png", 5.0, 11.0), ("12_플레오라.png", ple, min(ple + 6.0, dur - 6.0)), ("14_라이브_영상아래.png", dur - 6.0, dur)]
            inside = [(s, e) for f, s, e in boxes if "영상아래" not in f]
            subs = [sb for sb in subs if not any(sb["s"] < e - 0.2 and sb["e"] > s + 0.2 for s, e in inside)]
            dev = []
            for sb in subs:
                for nm, kws in DEVICE:
                    if any(k in sb["text"] for k in kws) and not any(d["kind"] == nm and abs(d["t"] - sb["s"]) < 6 for d in dev):
                        dev.append(dict(t=sb["s"], kind=nm, text=sb["text"]))
            R.append(dict(longform=name, src_id=P["src_id"], n=sh["n"], name=f"{name}_숏폼{sh['n']}", type=sh["type"], title=sh["title"], alts=sh["alts"],
                          dur=dur, pieces=pieces, subs=subs, boxes=[dict(file=f, s=round(s, 3), e=round(e, 3)) for f, s, e in boxes], devices=dev))
            print(f"{name}_숏폼{sh['n']} {dur:.1f}초 조각 {len(pieces)} 자막 {len(subs)} 플레오라 {ple:.1f}초 시각장치 제안 {len(dev)}")
    return R

if __name__ == "__main__":
    json.dump(build(load(sys.argv[1]), sys.argv[2]), open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
