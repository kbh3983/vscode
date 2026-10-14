"""포인트 에이전트 — 한 줄 포인트 자막 글자를 사용자 가이드 띠 안에 같은 높이로 맞추기 (2026-10-12 승인)

  python fit_guide.py jobs   <clips.json> <out_dir>                 → <out_dir>/jobs.json (render_solo.jsx 입력, 16개씩)
  python fit_guide.py plan   <clips.json> <out_dir> [위 y] [아래 y] [글자 높이]  → <out_dir>/plan.json + 표
  python fit_guide.py verify <clips.json> <out_dir> [위 y] [아래 y]  (apply 뒤 a<i>_<j>.png 다시 렌더한 것으로 확인)
- 기본값: 가이드 띠 y 876~997, 글자 높이 113 (자세교정 V2 가이드, 사용자 스크린샷 측정)
- 클립마다 그 트랙만 보이게 50%·85% 시점 + 포인트 자막 없는 배경을 렌더 → 차이 영역. 글자 몸통 = 행·열 밀도가 최대의 15% 넘는 곳 (반짝이 등 장식 제외)
- 두 줄(글자 몸통 높이가 한 줄 높이의 1.6배 이상)은 건드리지 않고 표에 "두 줄 — 그대로"로 표시 (사용자 결정 2026-10-12)
- 1.25~1.6배는 "확인 필요"(불꽃 같은 큰 장식, PD 말풍선, 제품 안내 배너 등) → 자동으로 안 바꾸고 사용자에게 물음. 장식이 큰 한 줄 자막(불말)은 밀도 기준 60%로 몸통을 다시 재서 맞춤
- 계산: 새 비율 = 기존 × (글자 높이 / 몸통 높이), 화면 폭 1840 넘으면 줄임. 위치는 몸통 가운데가 띠 가운데로, 가로는 그대로(화면 밖이면 안쪽으로)
"""
import json, os, sys
import numpy as np
from PIL import Image

def load(p): return json.load(open(p, encoding="utf-8"))

def jobs(clips, out):
    C = load(clips); base = out.replace("\\", "/").rstrip("/") + "/"; J = []
    for i, c in enumerate(C):
        d = c["e"] - c["s"]
        for j, fr in enumerate((0.5, 0.85)):
            t = round(c["s"] + d * fr, 2)
            J.append([-1, t, base + f"c{i:02d}_{j}_bg.png"]); J.append([c["v"], t, base + f"c{i:02d}_{j}.png"])
    B = [J[k:k + 16] for k in range(0, len(J), 16)]
    json.dump(B, open(os.path.join(out, "jobs.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(len(J), "renders,", len(B), "batches")

def mask(out, i, pre):
    ms = []
    for j in (0, 1):
        a = os.path.join(out, f"{pre}{i:02d}_{j}0.png"); b = os.path.join(out, f"c{i:02d}_{j}_bg0.png")
        if not os.path.exists(a): continue
        A = np.asarray(Image.open(a).convert("RGB")).astype(int); Bg = np.asarray(Image.open(b).convert("RGB")).astype(int)
        ms.append(np.abs(A - Bg).sum(2) > 60)
    return np.any(ms, axis=0) if ms else None

def core(m):
    if m is None or m.sum() < 50: return None, None
    rc, cc = m.sum(1), m.sum(0)
    rows = np.nonzero(rc >= 0.15 * rc.max())[0]; cols = np.nonzero(cc >= 0.15 * cc.max())[0]
    ys, xs = np.nonzero(m)
    return [int(cols.min()), int(cols.max()), int(rows.min()), int(rows.max())], [int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())]

def plan(clips, out, top=876, bot=997, ht=113):
    C = load(clips); top, bot, ht = float(top), float(bot), float(ht); ty = (top + bot) / 2; P = []
    for i, c in enumerate(C):
        cb, fb = core(mask(out, i, "c"))
        if cb is None: print(i, c["name"], "안 보임 — 확인 필요"); continue
        h = cb[3] - cb[2] + 1
        if h >= ht * 1.6: print(i, c["name"], f"두 줄(높이 {h}) — 그대로"); continue
        if h >= ht * 1.25: print(i, c["name"], f"확인 필요(높이 {h}, 몸통 y {cb[2]}~{cb[3]}) — 큰 장식·말풍선·배너일 수 있음, 사용자에게 묻기"); continue
        k = ht / h; fw = fb[1] - fb[0] + 1
        if fw * k > 1840: k = 1840 / fw
        pcx, pcy = (cb[0] + cb[1]) / 2, (cb[2] + cb[3]) / 2
        fcx, half = (fb[0] + fb[1]) / 2, fw * k / 2; shift = 0
        if fcx - half < 40: shift = 40 + half - fcx
        if fcx + half > 1880: shift = 1880 - half - fcx
        d0x, d0y = (c["pos"][0] - 0.5) * 1920, (c["pos"][1] - 0.5) * 1080
        d1x = (960 + d0x - pcx) * k + pcx + shift - 960; d1y = (540 + d0y - pcy) * k + ty - 540
        P.append(dict(i=i, v=c["v"], s=c["s"], name=c["name"], sc=round(c["sc"] * k, 2), pos=[round(0.5 + d1x / 1920, 5), round(0.5 + d1y / 1080, 5)]))
        print(i, c["name"], f"몸통 y {cb[2]}~{cb[3]} → 비율 {c['sc']}→{P[-1]['sc']}")
    json.dump(P, open(os.path.join(out, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(len(P), "clips to set")

def verify(clips, out, top=876, bot=997):
    C = load(clips); bad = 0
    for p in load(os.path.join(out, "plan.json")):
        cb, _ = core(mask(out, p["i"], "a"))
        ok = cb and cb[2] >= float(top) - 3 and cb[3] <= float(bot) + 3 and cb[0] > 3 and cb[1] < 1916
        bad += 0 if ok else 1
        print(p["i"], C[p["i"]]["name"], "글자 y", cb[2:] if cb else None, "OK" if ok else "확인")
    print("확인 필요", bad)

if __name__ == "__main__":
    {"jobs": jobs, "plan": plan, "verify": verify}[sys.argv[1]](*sys.argv[2:])
