"""정렬 에이전트 (가이드라인): 포인트 자막을 가이드선 A/B/C/X/Y에 맞추기 (2026-10-14, 정렬 에이전트 — agents/정렬/playbook_정렬.md)

  python align_guide.py jobs   <clips.json> <out_dir>   → <out_dir>/jobs.json (render_solo.jsx 입력, 16개씩)
  python align_guide.py plan   <clips.json> <out_dir>   → <out_dir>/plan.json (apply_guide.jsx 입력) + 표
  python align_guide.py verify <clips.json> <out_dir>   (apply 뒤 a<i>_<j>.png 다시 렌더한 것으로 확인)
- 가이드 (1920×1080): A y1028 / B y925 / C y840, X x36 / Y x960
- 모션이 끝난 정지 상태 기준: 클립마다 두 시점(앞쪽·끝 0.35초 전)을 그 트랙만 보이게 + 배경 렌더 → 차이 영역(테두리·그림자 포함)
  두 시점 범위가 3px 넘게 다르면 "모션 안 끝남" 확인 필요
- 유형 (템플릿 이름): 한 줄 가운데 = B~A + 가운데 Y / 두 줄 왼쪽(요령 2단) = 윗줄 위 C ~ 아랫줄 아래 A + 왼쪽 X /
  Tip 세 줄 = Tip 상자 아래 C ~ 아랫줄 아래 A + 왼쪽 X
- 2단 템플릿은 줄별 크기를 못 바꿔서(글자 크기 값 잠김) 클립 전체 모션 비율·위치로 근사 — B선은 몇 px 어긋날 수 있음 (사용자 선택, 2026-10-14)
- 글자 기준 "glyph" (2026-10-14 하체루틴 회고): 그림 섞인 자막(불꽃)·프리미어 그래픽(제목 없음/그래픽)은 **글자**로 잼 —
  맨 아래 덩어리(두 줄이면 아랫줄)에서 행 밀도가 최대의 4%(불꽃은 45% — 불길 27~34%) 넘는 줄 = 글자(테두리 포함) → 불꽃·쉼표 꼬리는 빠짐.
  B~A + 가운데 Y. 위에 작은 줄이 있어도 신경 안 씀. 하체루틴 회고 4개로 시험: 사용자가 맞춘 값과 2px 안
- 프리미어 그래픽(제목 없음/그래픽)은 이름·위치로 반응 자막(3:17 "자극이 잘 안 오던데..")과 구분 안 됨 →
  plan은 "확인 필요"로만 표시, 사용자가 고른 번호를 3번째 인자로: plan <clips> <out> 2,3,4
- SKIP: 세트안내·반응(실망·의성어)·해설·만원 = 인물 근처에 일부러 둔 것 → 정렬 안 함 (사용자 2026-10-14)
"""
import json, os, sys
import numpy as np
from PIL import Image

A, B, C, X, Y = 1028, 925, 840, 36, 960
KIND = {"강한말_주황_PANDA": "center", "PYNPA-강한말-빨강_2106": "center","요약_색강조_한줄_AE": "center", "요령_노랑_2단_AE": "left2", "Tip_동작요령_2단_AE": "tip",
        "불꽃_강조_PANDA": "glyph", "제목 없음": "glyph", "그래픽": "glyph"}
SKIP = {"정보바_세트안내_AE", "05_실망 우울 좌절 모션자막_AE", "PYNPA-[기본예능]의성어-부끄_2111", "해설_괄호_AE", "E09_만원"}
GENERIC = {"제목 없음", "그래픽"}   # 프리미어 그래픽 — 사용자가 고른 것만
GLYPH_TH = {"불꽃_강조_PANDA": 0.45}   # 글자 몸통 행 밀도 기준 (기본 0.04)
TOL = 3

def load(p): return json.load(open(p, encoding="utf-8"))

def times(c):
    d = c["e"] - c["s"]
    return round(c["s"] + min(1.6, d * 0.45), 2), round(c["e"] - 0.35, 2)

def jobs(clips, out):
    C_ = load(clips); base = out.replace("\\", "/").rstrip("/") + "/"; J = []
    for i, c in enumerate(C_):
        for j, t in enumerate(times(c)):
            J.append([-1, t, base + f"c{i:02d}_{j}_bg.png"]); J.append([c["v"], t, base + f"c{i:02d}_{j}.png"])
    Bt = [J[k:k + 16] for k in range(0, len(J), 16)]
    json.dump(Bt, open(os.path.join(out, "jobs.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(len(J), "renders,", len(Bt), "batches")

def boxes(out, i, pre):
    """시점마다 [왼, 오른, 위, 아래, Tip 상자 아래] (차이 영역)"""
    R = []
    for j in (0, 1):
        a = os.path.join(out, f"{pre}{i:02d}_{j}0.png"); b = os.path.join(out, f"c{i:02d}_{j}_bg0.png")
        if not os.path.exists(a): R.append(None); continue
        m = np.abs(np.asarray(Image.open(a).convert("RGB")).astype(int) - np.asarray(Image.open(b).convert("RGB")).astype(int)).sum(2) > 60
        rc = m.sum(1); rows = np.nonzero(rc > 3)[0]
        if len(rows) == 0: R.append(None); continue
        cols = np.nonzero(m.sum(0) > 3)[0]
        top = int(rows[0]); k = top                      # 맨 위 덩어리(Tip 상자)의 아래 끝 = 첫 빈 줄 바로 위
        while k + 1 < len(rc) and rc[k + 1] > 3: k += 1
        R.append([int(cols[0]), int(cols[-1]), top, int(rows[-1]), k])
    return R

def glyph(out, i, pre, j=1, th=0.04):
    """맨 아래 글자 줄의 [왼, 오른, 위, 아래] — 그림 장식·문장부호 꼬리 뺀 글자 몸통"""
    a = os.path.join(out, f"{pre}{i:02d}_{j}0.png"); b = os.path.join(out, f"c{i:02d}_{j}_bg0.png")
    if not os.path.exists(a): return None
    m = np.abs(np.asarray(Image.open(a).convert("RGB")).astype(int) - np.asarray(Image.open(b).convert("RGB")).astype(int)).sum(2) > 60
    rc = m.sum(1); rows = np.nonzero(rc > 3)[0]
    if len(rows) == 0: return None
    st = rows[0]; seg = []
    for p, q in zip(rows[:-1], rows[1:]):
        if q - p > 6: seg.append((st, p)); st = q
    seg.append((st, rows[-1])); s0, s1 = seg[-1]
    band = rc[s0:s1 + 1]; core = np.nonzero(band >= th * band.max())[0] + s0
    t, b_ = int(core[0]), int(core[-1]); cols = np.nonzero(m[t:b_ + 1].sum(0) > 3)[0]
    return [int(cols[0]), int(cols[-1]), t, b_]

def plan(clips, out, ok_generic=""):
    C_ = load(clips); P = []; okg = {int(x) for x in ok_generic.split(",") if x.strip()}
    for i, c in enumerate(C_):
        kind = KIND.get(c["name"]); bx = boxes(out, i, "c"); tag = "%d:%05.2f" % (c["s"] // 60, c["s"] % 60)
        if c["name"] in SKIP: print(i, tag, c["name"], "인물 근처 유형 — 그대로"); continue
        if not kind: print(i, tag, c["name"], "유형 없음 — 그대로(새 템플릿이면 사용자에게 유형 확인)"); continue
        if kind == "glyph":
            th = GLYPH_TH.get(c["name"], 0.04); g = glyph(out, i, "c", 1, th); g0 = glyph(out, i, "c", 0, th)
            if not g: print(i, tag, c["name"], "글자 못 찾음 — 확인 필요"); continue
            l, r, t, b = g; px, py = c["pos"][0] * 1920, c["pos"][1] * 1080
            if c["name"] in GENERIC and i not in okg: print(i, tag, c["name"], f"프리미어 그래픽(글자 x{l}~{r} y{t}~{b}) — 확인 필요: 정렬할지 사용자에게 묻기"); continue
            if g0 and max(abs(p - q) for p, q in zip(g0, g)) > TOL: print(i, tag, c["name"], "모션 안 끝남?", g0, g); continue
            k = (A - B) / (b - t); nx = Y - ((l + r) / 2 - px) * k; ny = B - (t - py) * k
            P.append(dict(i=i, v=c["v"], s=c["s"], name=c["name"], kind=kind, th=th, sc=round(c["sc"] * k, 3), pos=[round(nx / 1920, 6), round(ny / 1080, 6)]))
            print(i, tag, c["name"], kind, f"글자 x{l}~{r} y{t}~{b}", f"→ 비율 {c['sc']}→{P[-1]['sc']}", "★오른쪽 넘침" if nx + (r - px) * k > 1884 else ""); continue
        if None in bx: print(i, tag, c["name"], "안 보임 — 확인 필요"); continue
        if max(abs(p - q) for p, q in zip(bx[0][:4], bx[1][:4])) > TOL: print(i, tag, c["name"], "모션 안 끝남?", bx); continue
        l, r, t, b, tipb = bx[1]
        if kind == "tip" and t > 820: kind = "left2"     # Tip 배지를 끈 클립(하체루틴 1:53) → 두 줄로
        px, py = c["pos"][0] * 1920, c["pos"][1] * 1080
        if kind == "center":
            if abs((l + r) / 2 - 960) > 200: print(i, tag, c["name"], "가운데가 아님 — 확인 필요", bx[1]); continue
            k = (A - B) / (b - t); nx = Y - ((l + r) / 2 - px) * k; ny = B - (t - py) * k
        else:
            if l > 200: print(i, tag, c["name"], "왼쪽 정렬이 아님 — 확인 필요", bx[1]); continue
            ref = t if kind == "left2" else tipb
            if kind == "tip" and tipb - t > 150: print(i, tag, c["name"], "Tip 상자 못 찾음 — 확인 필요", bx[1]); continue
            k = (A - C) / (b - ref); nx = X - (l - px) * k; ny = C - (ref - py) * k
        nr = nx + (r - px) * k
        P.append(dict(i=i, v=c["v"], s=c["s"], name=c["name"], kind=kind, sc=round(c["sc"] * k, 3), pos=[round(nx / 1920, 6), round(ny / 1080, 6)]))
        print(i, tag, c["name"], kind, f"범위 x{l}~{r} y{t}~{b}" + (f" Tip아래 {tipb}" if kind == "tip" else ""), f"→ 비율 {c['sc']}→{P[-1]['sc']}", "★오른쪽 넘침" if nr > 1884 else "")
    json.dump(P, open(os.path.join(out, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(len(P), "clips to set")

def verify(clips, out):
    C_ = load(clips); bad = 0
    for p in load(os.path.join(out, "plan.json")):
        bx = boxes(out, p["i"], "a")[1]
        if p["kind"] == "glyph": g = glyph(out, p["i"], "a", 1, p.get("th", 0.04)); bx = g + [0] if g else None
        tag = "%d:%05.2f" % (p["s"] // 60, p["s"] % 60)
        if not bx: print(p["i"], tag, "안 보임"); bad += 1; continue
        l, r, t, b, tipb = bx
        if p["kind"] in ("center", "glyph"): d = dict(위=t - B, 아래=b - A, 가운데=(l + r) / 2 - Y)
        else: d = dict(위=(t if p["kind"] == "left2" else tipb) - C, 아래=b - A, 왼쪽=l - X)
        ok = all(abs(v) <= TOL for v in d.values()) and r < 1916
        bad += 0 if ok else 1
        print(p["i"], tag, p["name"], {k: round(v, 1) for k, v in d.items()}, "OK" if ok else "확인")
    print("확인 필요", bad)

if __name__ == "__main__":
    {"jobs": jobs, "plan": plan, "verify": verify}[sys.argv[1]](*sys.argv[2:])
