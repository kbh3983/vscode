"""포인트 에이전트 — 배치 계획 만들기 (agents/포인트/AGENT.md P3~P4)

사용: python scripts/point/plan.py <points.json> <srt> <out_배치.json> [words.json]
points.json: {"sequence": 이름, "sequence_id": ID, "first_track": 새 트랙 시작 index(0부터),
              "points": [{"cues": [시작번호, 끝번호], "type": 유형, "text": 넣을 문구, "why": 이유,
                          "at": 그 말이 나오는 대사 구절(선택, 없으면 text), "who": 반응 자막을 붙일 인물(선택: 왼쪽/오른쪽/가운데),
                          "suggest": 효과 제안(선택 — 효과음·확대·화면 효과, 마커와 보고에만)}],
              "ending": 엔딩 시작 초(선택 — 엔딩 영상 클립 시작 또는 본편 끝. 있으면 그 앞 ENDING_SKIP초 안의 웃음·마무리는 뺌),
              "genre": "운동" / "설명" / "교정"(선택 — 강조 1순위가 다름 GENRE_FIRST, 교정은 감정·반응 후보를 안 냄 GENRE_SKIP)}
  구간 항목 더: "alts": 같은 템플릿에 넣을 다른 문구 1~2개(정보·요령 — 후보 2·3번째를 다른 템플릿 대신 다른 문구로, 2026-10-13)
  구간 선택 항목 더: "image_prompt": 설명 이미지 GPT 프롬프트(해부·척추·디스크 설명 대사 — 마커·보고에만, 2026-10-13)
문구 형식 (2026-10-12 회고 반영): 요령 "윗줄 / 아랫줄" (요약·명령형), 세트안내 "앞 {강조} 뒤" (강조 = 초록), 해설 "[...]" (괄호 없으면 붙임)
시간 (2026-10-12 회고 반영): words.json(cue_words.py)이 있으면 at 구절이 실제로 나오는 단어 시작에 맞춤, 없으면 대사 안 글자 위치로 추정.
  길이는 유형별 DURATION (사용자 최종본: 반응 1~2.2초, 감정 강조 1.3~2.5초, 요령·정보 = 그 말이 끝날 때까지·최소 3초, 최대는 템플릿 길이 15초(2026-10-14 사용자: "최대7초 라는 한계 없이, 그 말이 끝날 때까지로"), 정보 바 3~6초, 해설 1~3.5초). 다음 구간과 겹치지 않게 자름
유형 → 후보 템플릿은 아래 TYPES (파일명 정리 전 임시 태그표, 이름으로 뜻을 알 수 있는 것만).
후보 규칙 (agents/포인트/criteria.md): 구간당 최대 MAX_CANDIDATES개, 같은 스타일의 색상 변형은 하나만.
"""
import json, os, re, sys, zipfile

MAX_CANDIDATES = 3  # 사용자 지정 2026-10-11
# 글자 수 한계 (화면 확인값). 넘으면 그 후보는 건너뛴다 / 두 줄로 나눔(TWO_LINE)
MAX_CHARS = {"[by. Lily] #28 예능 강조 자막 모음.ver3": 4}
# 한 줄에 들어가는 글자 수 (띄어쓰기 제외, 1800px 기준 실측 — 하체루틴 포인트 2026-10-11). 넘으면 두 줄로 나눔
# 의성어 템플릿은 글자가 왼쪽에 치우쳐 실측보다 2자 낮춤 (틀어진골반 0:38 15자 넘침)
TWO_LINE_OVER = {"05_실망 우울 좌절 모션자막": 21, "08_분노 화나는 모션자막": 17, "10_분노 화나는 모션자막": 17,
                 "PYNPA-[기본예능]옆말(아래)-분홍_2111": 16, "PYNPA-[기본예능]의성어-깜짝_2116": 11,
                 "PYNPA-[기본예능]의성어-부끄_2111": 13, "PYNPA-[기본예능]의성어-분노_2111": 11,
                 "PYNPA-[기본예능]의성어-우울_2112": 10, "PYNPA-[데코]러블리-분홍_2110": 14,
                 "PYNPA-[데코]에필-노랑_2110": 15, "PYNPA-[데코]우울1_2109": 12, "PYNPA-강한말-검정_2106": 16,
                 "PYNPA-강한말-빨강_2106": 16, "PYNPA-강한말-주황_2106": 16, "PYNPA-뾰족말-노랑_2106": 20,
                 "봄자막 03-잔망스럽고 귀여운 움직임": 16, "봄자막 04-즐겁게 흥얼거리는 움직임": 15,
                 "봄자막 06-뿅 솟아오르는(빠르게)": 17, "봄자막 12-꼬물꼬물": 17, "봄자막 13-기분좋은 움직임": 12}
# 화면 아래쪽에 놓이는 템플릿 — 두 줄이면 70px 위로 (아래 끝에 닿지 않게)
RAISE_TWO_LINE = {"봄자막 03-잔망스럽고 귀여운 움직임": 70, "봄자막 04-즐겁게 흥얼거리는 움직임": 70, "봄자막 06-뿅 솟아오르는(빠르게)": 70,
                  "봄자막 12-꼬물꼬물": 70, "봄자막 13-기분좋은 움직임": 70, "PYNPA-강한말-검정_2106": 70, "PYNPA-강한말-빨강_2106": 70,
                  "PYNPA-강한말-주황_2106": 70, "05_실망 우울 좌절 모션자막": 70, "08_분노 화나는 모션자막": 70, "10_분노 화나는 모션자막": 70,
                  "PYNPA-[데코]우울1_2109": 100, "PYNPA-[데코]에필-노랑_2110": 100, "PYNPA-[데코]에필-초록_2110": 100}   # 두 줄일 때 올릴 px (틀어진골반 8:51·13:45·17:01 아래 끝 닿음 → 100)
COLORS = "빨강|주황|노랑|초록|하늘|민트|분홍|보라|검정|회색|파랑|흰색"
TEMPLATE_DIR = os.path.join(os.environ["APPDATA"], "Adobe", "Common", "Motion Graphics Templates")

# 2026-10-11 임시 태그표 — 사용자가 파일명을 정리하면 파일명 태그로 바꾼다
TYPES = {
    "강조": ["PYNPA-강한말-빨강_2106",   # 1순위 강한말-빨강 (6회)
             "PYNPA-강한말-주황_2106", "PYNPA-강한말-검정_2106",
             "PYNPA-강조말-노랑_2106", "PYNPA-강조말-하늘_2106", "PYNPA-뾰족말-노랑_2106"],
    # 정보: 요약_색강조_한줄 하나만 쓰임 (틀어진골반 최종본 6회, 요약_2단_초록·PYNPA 강조말 0회) → 구간에 alts가 있으면 후보 2·3번째는 같은 템플릿 다른 문구
    "정보": ["요약_색강조_한줄",   # 2026-10-13 사용자 제작 요약 그래픽 AE판 — 설명형 영상의 정보·요약 (목교정기 최종본 4곳, PYNPA 강조말은 매번 지워짐)
             "요약_2단_초록", "요약_2단_빨강", "요약_2단_노랑",   # 2026-10-13 자세교정 최종본 요약 2단 (색 변형이라 한 구간에 하나만 — style_key)
             "PYNPA-강조말-노랑_2106", "PYNPA-강조말-하늘_2106", "PYNPA-강한말-검정_2106",
             "PYNPA-[기본예능]옆말(아래)-분홍_2111"],   # Lily ver3은 3~4글자용이라 긴 문구가 화면을 넘침 → 2026-10-11 사용자 지시로 교체
    "놀람": ["PYNPA-강조말-노랑_2106", "PYNPA-[기본예능]의성어-깜짝_2116", "봄자막 06-뿅 솟아오르는(빠르게)"],   # 1순위 강조말-노랑 (4회, 2026-10-11)
    "긍정": ["PYNPA-[데코]러블리-분홍_2110", "봄자막 13-기분좋은 움직임", "봄자막 04-즐겁게 흥얼거리는 움직임"],   # 1순위 러블리-분홍 (4회)
    "부정": ["05_실망 우울 좌절 모션자막", "PYNPA-[데코]우울1_2109", "PYNPA-[기본예능]의성어-우울_2112",   # 1순위 05_실망 (2026-10-12 사용자 승인 — 옆구리살 최종본 05_실망_AE 2회·[데코]우울1 0회. 이전 1순위 [데코]우울1 3회)
             "PYNPA-[데코]우울2_2109", "PYNPA-[기본예능]의성어-눈물_2111"],
    "화남": ["08_분노 화나는 모션자막", "10_분노 화나는 모션자막", "PYNPA-[기본예능]의성어-분노_2111",
             "PYNPA-불말_2106", "PYNPA-[데코]불말-빨강_2110", "PYNPA-[데코]불말-주황_2110"],
    "웃음": ["봄자막 12-꼬물꼬물", "봄자막 03-잔망스럽고 귀여운 움직임", "PYNPA-[기본예능]의성어-부끄_2111"],   # 1순위 봄12 (3회)
    "마무리": ["PYNPA-[데코]에필-노랑_2110", "PYNPA-[데코]에필-초록_2110", "PYNPA-강조말-노랑_2106",
               "PYNPA-강한말-검정_2106"],
    # 2026-10-12 회고 반영 — 사용자 종편(옆구리살)의 정보형 그래픽을 AE 템플릿으로 (원본 폰트 유지, playbook_AE변환.md 8장)
    "요령": ["Tip_동작요령_2단", "요령_노랑_2단"],   # 동작 요령·주의점 (Tip! 8회 — 운동 영상의 중심)
    "세트안내": ["정보바_세트안내"],                  # 세트·횟수·시청자 참여 안내 (4회)
    "해설": ["해설_괄호"],                            # 출연자 상태를 제작진이 해설 (3회). PD·출연자 속마음("죄송합니다..ㅎ")은 사용자 템플릿 최박사_PD_속마음 — 내 템플릿 폴더에 들어오면 여기 추가 (보류 2번)
    "제품안내": ["정보바_2줄"],                       # 2026-10-13 제품 안내 정보 바 두 줄 (문구 고정 — 목교정기 최종본)
}
# 영상 성격별 1순위 (2026-10-13 사용자 승인 — 세 영상 회고: 운동 하체루틴 강한말-빨강 5 / 설명·상담 목교정기 강조말-하늘 3·자세교정 강조말-노랑 4)
GENRE_FIRST = {"운동": {"강조": "PYNPA-강한말-빨강_2106"}, "설명": {"강조": "PYNPA-강조말-노랑_2106"}}
# 이 유형 자막이 나오는 순간은 B캠 반응 컷을 제안 (마커·보고) — 목교정기·자세교정 최종본에서 반응·강조 자막 순간 B캠 (2026-10-13 확정)
BCAM_TYPES = {"웃음", "놀람", "부정", "화남", "강조"}
# 반응 자막 — 인물 근처(머리 위·턱 밑)에 놓는 유형 (fit_person.py). 나머지는 가이드 띠 (fit_guide.py)
PERSON_TYPES = {"웃음", "놀람", "부정", "화남"}
# 유형별 길이 (최소, 최대 초) — 사용자 최종본 실측 (옆구리살 2026-10-12)
# 요령·정보 = 말 길이에 맞춤, 최소 3초·최대 7초 (2026-10-13 사용자 승인 — 참고 3편 요령 2단 3.0~6.9초, 틀어진골반 최종본 평균 3.6초. 이전 2~4초)
DURATION = {"웃음": (1.0, 2.2), "놀람": (1.0, 2.2), "부정": (1.0, 2.2), "화남": (1.0, 2.2),
            "긍정": (1.3, 2.5), "강조": (1.3, 2.5), "요령": (3.0, 15.0), "세트안내": (3.0, 6.0),
            "해설": (1.0, 3.5), "정보": (3.0, 15.0), "마무리": (1.5, 4.0), "제품안내": (3.0, 6.5)}
LONG_TYPES = {"요령", "세트안내", "정보", "마무리", "제품안내"}   # 대사 끝까지 보여 줌(최대 안에서). 나머지는 그 말 끝 + 0.4초
# 엔딩 앞 웃음·마무리는 후보로 안 냄 (2026-10-13 사용자 승인 — 목교정기 #19·#21 웃음·#22 마무리, 옆구리살 #30 마무리 모두 삭제됨)
ENDING_SKIP = 60.0
ENDING_SKIP_TYPES = {"웃음", "마무리"}
# 설명·시범 위주 교정 영상은 감정·반응 자막을 전부 지움 (틀어진골반 최종본 감정·반응 5개 모두 삭제, 2026-10-13 사용자 승인) → 요령·정보 위주
GENRE_SKIP = {"교정": {"웃음", "놀람", "부정", "화남", "강조", "긍정"}}
GENRE_FIRST_ALIAS = {"교정": "운동"}


def fields_for(base, text):
    """여러 칸 템플릿의 칸별 문구. 칸이 하나면 None"""
    if base in ("Tip_동작요령_2단", "요령_노랑_2단") or base.startswith("요약_2단_"):
        text = re.sub(r"[{}\[\]]", "", text)   # 색 표시({하늘} [초록])는 2단 템플릿엔 없음 — 같은 문구를 요약_색강조_한줄과 같이 쓸 때 (2026-10-13)
        if " / " in text:
            a, b = text.split(" / ", 1)
        else:
            w = text.split(" "); k = max(1, len(w) // 2); a, b = " ".join(w[:k]), " ".join(w[k:])
        return {"윗줄 텍스트": a.strip(), "아랫줄 텍스트": b.strip()}
    if base == "정보바_세트안내":
        m = re.match(r"^(.*?)\{(.*?)\}(.*)$", text)
        return {"앞 문구": m.group(1), "강조 문구": m.group(2), "뒤 문구": m.group(3)} if m else {"앞 문구": text, "강조 문구": "", "뒤 문구": ""}
    if base == "요약_색강조_한줄":   # 칸 하나, {하늘} [초록] 표시는 그대로 넘김 (템플릿이 색으로 바꿈)
        return {"자막 텍스트": text.replace(" / ", " ").strip()}
    if base == "정보바_2줄":   # "윗줄 / 아랫줄", {노랑} 표시는 그대로
        a, b = (text.split(" / ", 1) + [""])[:2]
        return {"윗줄 텍스트": a.strip(), "아랫줄 텍스트": b.strip()}
    if base == "해설_괄호":
        t = text.strip()
        return {"자막 텍스트": t if t.startswith("[") else "[" + t + "]"}
    return None


def plain(text):
    """칸 하나짜리 템플릿에 넣을 문구 — 칸 나눔 표시를 뺀다"""
    return re.sub(r"\s+", " ", re.sub(r"[{}\[\]]", "", text.replace(" / ", " "))).strip()


def norm(t):
    return re.sub(r"[^0-9A-Za-z가-힣]", "", t)


def phrase_time(phrase, a, z, cues, words):
    """phrase가 실제로 나오는 (시작, 끝, 근거). words(단어 시간)가 있으면 그것, 없으면 대사 안 글자 위치로 추정"""
    import difflib
    lo, hi = cues[a][0] - 0.5, cues[z][1] + 0.5
    target = norm(phrase)
    if words and target:
        W = [w for w in words if lo <= w["s"] <= hi and norm(w["w"])]
        best = None
        for i in range(len(W)):
            acc = ""
            for j in range(i, min(len(W), i + 30)):
                acc += norm(W[j]["w"])
                r = difflib.SequenceMatcher(None, acc, target).ratio()
                if best is None or r > best[0]:
                    best = (r, W[i]["s"], W[j]["e"])
                if len(acc) > len(target) * 1.5:
                    break
        if best and best[0] >= 0.6:
            return best[1], best[2], "단어"
    # 글자 위치 추정: 구간 대사들을 이어 붙이고 phrase와 가장 길게 겹치는 곳
    segs = [(cues[i][0], cues[i][1], norm(cues[i][2])) for i in range(a, z + 1)]
    full = "".join(x[2] for x in segs)
    m = difflib.SequenceMatcher(None, full, target, autojunk=False).find_longest_match(0, len(full), 0, len(target))
    if not full or m.size < 2:
        return cues[a][0], cues[z][1], "대사"

    def at(pos):
        for s0, e0, t in segs:
            if pos <= len(t):
                return s0 + (e0 - s0) * pos / max(1, len(t))
            pos -= len(t)
        return segs[-1][1]
    st = max(0, m.a - m.b)
    return at(st), at(min(len(full), st + len(target))), "추정"


def style_key(name):
    """색상·날짜를 뗀 스타일 이름. 예: PYNPA-강조말-노랑_2106 → PYNPA-강조말"""
    k = re.sub(r"_\d{4,6}$", "", name)
    return re.sub(r"-?(" + COLORS + r")$", "", k)


def kind(path):
    """AE = 애프터이펙트 템플릿(스크립트로 문구·폰트 변경 됨), PR = 프리미어 템플릿(직접 수정 필요)"""
    names = zipfile.ZipFile(path).namelist()
    return "AE" if any(n.endswith(".aegraphic") for n in names) else "PR"


def srt_times(path):
    def sec(s):
        h, m, r = s.split(":"); s2, ms = r.split(",")
        return int(h) * 3600 + int(m) * 60 + int(s2) + int(ms) / 1000
    cues = {}
    for b in re.split(r"\n\s*\n", open(path, encoding="utf-8-sig").read().strip()):
        l = b.strip().split("\n")
        a, z = l[1].split(" --> ")
        cues[int(l[0])] = (sec(a.strip()), sec(z.strip()), " ".join(l[2:]))
    return cues


def content_end(cues, a, z, start, text):
    """자막이 요약하는 말의 끝 (2026-10-13 사용자: "요령 자막 길이는 말에 맞추는 걸 기본으로")
    아랫줄(" / " 뒤, 없으면 전체) 핵심어(2글자 이상, 앞 2글자 비교)가 시작 줄부터 처음 나오는 줄의 끝. 못 찾으면 시작 줄 끝.
    "마지막으로 나오는 줄"은 트레이너가 같은 말을 반복해 거의 다 최대 7초가 됨 (하체루틴·틀어진골반 시험)"""
    tail = text.split(" / ")[-1]
    keys = [norm(w)[:2] for w in plain(tail).split() if len(norm(w)) >= 2]
    first = max([i for i in range(a, z + 1) if cues[i][0] <= start + 0.05] or [a])
    seen, end = set(), cues[first][1]
    for i in range(first, z + 1):
        line = norm(cues[i][2])
        hit = {k for k in keys if k in line}
        if hit:
            seen |= hit; end = cues[i][1]
            if len(seen) >= max(1, len(set(keys)) // 2):
                break
    return end


def main(points_path, srt_path, out_path, words_path=None):
    pts = json.load(open(points_path, encoding="utf-8"))
    cues = srt_times(srt_path)
    words = json.load(open(words_path, encoding="utf-8")) if words_path else None
    out = {"sequence": pts["sequence"], "sequence_id": pts["sequence_id"],
           "first_track": pts["first_track"], "points": []}
    ending = pts.get("ending")
    if ending:
        keep = []
        for p in pts["points"]:
            if p["type"] in ENDING_SKIP_TYPES and cues[p["cues"][0]][0] >= ending - ENDING_SKIP:
                print(f"  엔딩 앞 제외: [{p['type']}] {p['text']} ({cues[p['cues'][0]][0]:.1f}초, 엔딩 {ending:.1f}초)")
                continue
            keep.append(p)
        pts["points"] = keep
    skip = GENRE_SKIP.get(pts.get("genre", ""), set())
    if skip:
        for p in pts["points"]:
            if p["type"] in skip:
                print(f"  {pts['genre']} 영상 제외: [{p['type']}] {p['text']}")
        pts["points"] = [p for p in pts["points"] if p["type"] not in skip]
    for n, p in enumerate(pts["points"], 1):
        a, z = p["cues"]
        cands, styles = [], set()
        shown = plain(p["text"])
        order = list(TYPES[p["type"]])
        g = pts.get("genre", "")
        first = GENRE_FIRST.get(GENRE_FIRST_ALIAS.get(g, g), {}).get(p["type"])
        if first in order:
            order.remove(first); order.insert(0, first)
        for name in order:
            if len(cands) >= pts.get("max_candidates", MAX_CANDIDATES):   # 사용자가 구간당 후보 수를 정하면 (2026-10-13 하체루틴 "후보 2개씩")
                break
            if style_key(name) in styles:
                continue  # 같은 스타일 색상 변형은 하나만
            styles.add(style_key(name))
            if len(shown) > MAX_CHARS.get(name, 999):
                continue  # 이 템플릿에는 문구가 너무 김
            f = os.path.join(TEMPLATE_DIR, name + ".mogrt")
            ae = os.path.join(TEMPLATE_DIR, name + "_AE.mogrt")   # 프리미어 템플릿을 AE로 다시 만든 판이 있으면 그것을 씀 (문구·폰트 자동). AE판만 있는 것도 있음
            if os.path.exists(ae):
                name, f = name + "_AE", ae
            elif not os.path.exists(f):
                sys.exit("템플릿 없음: " + f)
            c = {"template": name, "path": f, "kind": kind(f)}
            base = name.replace("_AE", "")
            fl = fields_for(base, p["text"])
            if fl:
                c["fields"] = fl
            else:
                c["text"] = shown
            lim = TWO_LINE_OVER.get(base)
            if not fl and lim and len(shown.replace(" ", "")) > lim and " " in shown:
                c["two_line"] = True
                c["raise"] = RAISE_TWO_LINE.get(base, 0)
            cands.append(c)
        # 다른 문구 후보: 1순위 템플릿에 alts 문구 — 다른 템플릿 후보 대신 (2026-10-13 틀어진골반 회고 6장 1번)
        alts = p.get("alts", [])[:pts.get("max_candidates", MAX_CANDIDATES) - 1]
        if alts and cands:
            c0 = cands[0]; base0 = c0["template"].replace("_AE", "")
            cands = [c0]
            for t in alts:
                c = {"template": c0["template"], "path": c0["path"], "kind": c0["kind"], "alt": True}
                fl = fields_for(base0, t)
                if fl:
                    c["fields"] = fl
                else:
                    c["text"] = plain(t)
                cands.append(c)
        ps, pe, how = phrase_time(p.get("at") or shown, a, z, cues, words)
        lo, hi = DURATION.get(p["type"], (1.3, 4.0))
        start = pe + 0.3 if p["type"] == "해설" and p.get("at") else ps   # 해설은 그 말(질문 등)이 끝난 뒤
        end = content_end(cues, a, z, start, p["text"]) if p["type"] in LONG_TYPES else pe + 0.4   # 말 길이 = 자막 문구 핵심어가 마지막으로 나오는 대사 줄 끝
        if p["type"] == "해설":
            end = start + 2.3   # 해설은 말이 끝난 뒤 조용한 동안 (최종본 69~105프레임)
        end = min(max(end, start + lo), start + hi)
        out["points"].append({"n": n, "start": round(start, 3), "end": round(end, 3), "cue_start": cues[a][0], "time_by": how,
                              "type": p["type"], "person": p["type"] in PERSON_TYPES, "who": p.get("who", ""),
                              "suggest": p.get("suggest", ""), "image_prompt": p.get("image_prompt", ""),
                              "bcam": p["type"] in BCAM_TYPES,
                              "dialogue": " ".join(cues[i][2] for i in range(a, z + 1)),
                              "text": p["text"], "why": p["why"], "candidates": cands})
    # 같은 트랙에 겹치지 않게: 다음 구간 시작 0.1초 전에서 자름 (최소 0.8초는 남김)
    P = sorted(out["points"], key=lambda x: x["start"])
    for k in range(len(P) - 1):
        lim = P[k + 1]["start"] - 0.1
        if P[k]["end"] > lim:
            P[k]["end"] = round(max(P[k]["start"] + 0.8, lim), 3)
    for q in out["points"]:
        if q["type"] == "정보" and not any(c.get("alt") for c in q["candidates"]):
            print(f"  주의 {q['n']}: 정보 구간에 alts(다른 문구 1~2개)가 없음 — 후보 2·3번째가 잘 안 쓰는 템플릿으로 채워짐")
        if q["type"] == "요령" and " / " not in q["text"]:
            print(f"  주의 {q['n']}: 요령 문구는 '윗줄 / 아랫줄' (요약·명령형)")
        if q["type"] in PERSON_TYPES | {"강조", "긍정"} and len(plain(q["text"]).replace(" ", "")) > 12:
            print(f"  주의 {q['n']}: 감정·반응 문구는 짧게 (지금 {len(plain(q['text']).replace(' ', ''))}자) — 핵심 구절만")
    json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(out["points"]), "points,", sum(len(p["candidates"]) for p in out["points"]), "clips,",
          "max candidates", max(len(p["candidates"]) for p in out["points"]))


if __name__ == "__main__":
    main(*sys.argv[1:5])
