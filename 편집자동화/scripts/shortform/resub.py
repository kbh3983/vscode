"""숏폼 에이전트 — 대사 자막 줄 나누기 (한 줄 최대 15자, 공백 포함)
  python resub.py <shorts.json> <받아쓰기 폴더(t_<롱폼>.json)> <out.json> [고침.json] [--all]
2026-10-14 사용자: "텍스트가 긴 것들은 잘리네, 한 번에 15자 이하로 … 말의 템포와 쉬는 구간, 맥락에 맞춰서 … 필요에 따라 5~15자"
- 조각(pieces)·안내 박스는 그대로, subs만 다시 만든다
- 줄 나누기 = 비용 최소(DP): 15자 넘으면 불가 / 받아쓰기 문장 끝·쉼(0.25초↑)에서 끊으면 이득 / 어미·연결어미 뒤 이득 /
  관형형(…는·…한·…할·…된)·부사 뒤에서 끊으면 손해 / 5자 미만 줄은 손해 / 줄 안에 긴 쉼(0.6초↑)이 있으면 손해
- 고침.json: {"<숏폼 이름>": {"<이어진 원래 줄들, ' / '로>": ["새 줄1", "새 줄2", ...]}} — 눈으로 본 뒤 끊는 곳만 손으로 고칠 때 (단어는 그대로)
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from build_plan import KEY, clean

MAX, MIN = 15, 5
END = ("요", "다", "죠", "까", "죠?", "요?", "네", "야", "어", "지", "래", "자")              # 문장 끝 어미
CONN = ("고", "서", "는데", "은데", "니까", "면", "지만", "면서", "거든요", "는데요", "게", "도", "며", "려고", "라서", "해서", "하고")   # 연결
BIND = ("는", "은", "한", "할", "된", "될", "던", "운", "인", "의", "좀", "더", "잘", "안", "못", "다", "이", "그", "저", "이런", "그런", "어떤", "아주", "정말", "진짜", "가장", "제일", "굉장히", "너무", "이렇게", "그렇게")

def length(ws): return len(clean(" ".join(w[2] for w in ws)))

def brk_cost(w, nxt, seg_end):
    t = w[2].rstrip(".,?!")
    gap = (nxt[0] - w[1]) if nxt else 9
    c = 0.0
    if seg_end: c -= 4
    if gap > 0.6: c -= 4
    elif gap > 0.25: c -= 2
    elif gap > 0.12: c -= 0.7
    if t.endswith(END): c -= 2
    elif t.endswith(CONN): c -= 1.5
    if t in BIND or (len(t) >= 2 and t.endswith(("는", "한", "할", "된", "될", "던")) and not t.endswith(("하는데", "는데", "니는"))): c += 2.5
    if len(t) == 1: c += 1.5      # 한 글자 단어 뒤 (이, 그, 좀, 등) 는 다음 말과 붙는 경우가 많음
    return c

def line_cost(ws):
    n = length(ws)
    if n > MAX: return None
    c = 0.0
    if n < MIN: c += 4 + (MIN - n)
    c += 0.04 * (12 - n) ** 2 if n < 12 else 0
    for a, b in zip(ws, ws[1:]):
        g = b[0] - a[1]
        if g > 0.6: c += 6
    return c

def chunk(words, seg_end):
    N = len(words); best = [0.0] + [None] * N; prev = [0] * (N + 1)
    for j in range(1, N + 1):
        for i in range(j - 1, -1, -1):
            lc = line_cost(words[i:j])
            if lc is None:
                if j - i == 1: lc = 0      # 한 단어가 15자 넘으면 그대로
                else: break
            if best[i] is None: continue
            bc = brk_cost(words[j - 1], words[j] if j < N else None, seg_end[j - 1]) if j < N else 0
            v = best[i] + lc + bc + 3     # 줄 하나마다 +3 (너무 잘게 쪼개지 않게)
            if best[j] is None or v < best[j]: best[j], prev[j] = v, i
    out, j = [], N
    while j > 0: out.append(words[prev[j]:j]); j = prev[j]
    return out[::-1]

def piece_words(segs, a, b):
    W, E = [], []
    for sg in segs:
        ws = [w for w in sg["w"] if w[0] >= a - 0.01 and w[1] <= b + 0.3 and w[0] < b]
        for k, w in enumerate(ws): W.append(w); E.append(k == len(ws) - 1)
    return W, E

USED = set()
KEEP_ALL = "--all" in sys.argv   # 안내 박스 구간 자막도 남김 (2026-10-14 사용자: "안내자막 들어간 곳도 캡션 자막 추가" — 겹쳐도 됨, 비교용 별도 트랙)

def apply_fix(lines, fix):   # 고침: "줄1 / 줄2" (이어진 원래 줄들) → ["새 줄1", "새 줄2", ...] (단어는 그대로, 끊는 곳만)
    for key, new in fix.items():
        old = key.split(" / ")
        for i in range(len(lines) - len(old) + 1):
            if [clean(" ".join(x[2] for x in l)) for l in lines[i:i + len(old)]] == old:
                ws = [w for l in lines[i:i + len(old)] for w in l]; out, k = [], 0
                for nl in new: n = len(nl.split()); out.append(ws[k:k + n]); k += n
                assert k == len(ws), (key, new)
                lines = lines[:i] + out + lines[i + len(old):]; USED.add(key); break
    return lines

def resub(s, segs, fix):
    subs = []
    for pc in s["pieces"]:
        a, b, t = pc["src_in"], pc["src_out"], pc["at"]
        W, E = piece_words(segs, a, b)
        lines = chunk(W, E) if W else []
        lines = apply_fix(lines, fix)
        for ch in lines:
            s0 = t + max(ch[0][0], a) - a; s1 = t + min(ch[-1][1] + 0.12, b) - a
            subs.append(dict(s=round(s0, 3), e=round(s1, 3), text=clean(" ".join(x[2] for x in ch))))
    for k in range(len(subs) - 1):
        if subs[k + 1]["s"] - subs[k]["e"] < 0.5: subs[k]["e"] = subs[k + 1]["s"]
        subs[k]["e"] = min(subs[k]["e"], subs[k + 1]["s"])
    inside = [(bx["s"], bx["e"]) for bx in s["boxes"] if "영상아래" not in bx["file"]]
    if not KEEP_ALL: subs = [sb for sb in subs if not any(sb["s"] < e - 0.2 and sb["e"] > st + 0.2 for st, e in inside)]
    for sb in subs: sb["key"] = next((k for k in KEY if k in sb["text"]), "")
    return subs

if __name__ == "__main__":
    sys.argv = [a for a in sys.argv if a != "--all"]
    S = json.load(open(sys.argv[1], encoding="utf-8")); tdir = sys.argv[2]
    FIX = json.load(open(sys.argv[4], encoding="utf-8")) if len(sys.argv) > 4 else {}
    for s in S:
        segs = json.load(open(os.path.join(tdir, f"t_{s['longform']}.json"), encoding="utf-8"))
        s["subs"] = resub(s, segs, FIX.get(s["name"], {}))
        L = [len(sb["text"]) for sb in s["subs"]]
        miss = [k for k in FIX.get(s["name"], {}) if k not in USED]
        if miss: print("  못 찾은 고침:", miss)
        print(s["name"], "자막", len(L), "최대", max(L), "5자 미만", sum(l < MIN for l in L), "15자 초과", sum(l > MAX for l in L))
    json.dump(S, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
