"""프레임별 측정 (포인트 에이전트 — playbook_AE변환.md 3)

사용: python scripts/point/ae/measure_frames.py <폴더> <접두1> [<접두2>] [--n 60]
- 알파 합(투명도 %, 다 나타난 뒤 평균 기준), 글자 상자(위·아래·왼·오른, 알파>25), 무게중심, 이웃 프레임 차이(꿀렁거림)
- 접두 두 개면 나란히 비교 (예: pr_ ae_)
"""
import argparse, os
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("folder"); ap.add_argument("pre", nargs="+"); ap.add_argument("--n", type=int, default=60)
a = ap.parse_args()


def load(pre, n):
    f = os.path.join(a.folder, f"{pre}{n:02d}.png")
    return np.asarray(Image.open(f).convert("RGBA")).astype(float) if os.path.exists(f) else None


res = {}
for pre in a.pre:
    rows, prev = [], None
    for n in range(a.n):
        im = load(pre, n)
        if im is None: break
        al = im[..., 3]
        s = al.sum()
        ys, xs = np.where(al > 25)
        box = (int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())) if len(ys) else None
        cy = float((al.sum(axis=1) * np.arange(al.shape[0])).sum() / s) if s else 0
        cx = float((al.sum(axis=0) * np.arange(al.shape[1])).sum() / s) if s else 0
        diff = float(np.abs(al - prev).mean()) if prev is not None else 0
        rows.append(dict(s=s, box=box, cy=cy, cx=cx, diff=diff)); prev = al
    full = np.mean([r["s"] for r in rows[len(rows) // 2:]]) or 1
    for r in rows: r["op"] = r["s"] / full * 100
    res[pre] = rows

print("n | " + " | ".join(f"{p} 투명도% 상자(위,아래,왼,오른) 중심(x,y) 변화" for p in a.pre))
for n in range(max(len(v) for v in res.values())):
    parts = []
    for p in a.pre:
        r = res[p][n] if n < len(res[p]) else None
        parts.append("-" if r is None else f"{r['op']:5.1f} {r['box']} ({r['cx']:.0f},{r['cy']:.0f}) {r['diff']:.2f}")
    print(f"{n:2d} | " + " | ".join(parts))
