"""명강의모음 AE판 — 원본(프리미어 ref2/fNN.png) vs AE판(ae/fNNN.tif) 프레임별 비교

사용: python scripts/myeong/ae/compare.py "<템플릿 폴더>" [프레임 목록 예: 0-30,60,115] [--diff 프레임]
- 회색(128) 위에 합성한 RGB 차이와 알파 차이를 잰다. 싱크로율 = 합성 RGB 차이가 2 이하인 화소 비율(그래픽이 있는 화소 기준)
- --diff N: N프레임의 차이 그림을 <폴더>/diff_N.png 로 (원본 | AE | 차이×8)
"""
import sys, os
import numpy as np
from PIL import Image

folder = sys.argv[1]
spec = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else None

diff_at = int(sys.argv[sys.argv.index("--diff") + 1]) if "--diff" in sys.argv else None
cand = sys.argv[sys.argv.index("--cand") + 1] if "--cand" in sys.argv else "ae"   # pr_ae = 프리미어에 AE판을 놓고 뽑은 프레임


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cmp_lib import load, over  # noqa: E402


def frames():
    n = len([f for f in os.listdir(os.path.join(folder, "ref2")) if f.endswith(".png")])
    if not spec:
        return range(n)
    out = []
    for part in spec.split(","):
        if "-" in part:
            a, b = part.split("-"); out += list(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    return out


rows = []
for f in frames():
    r = load(os.path.join(folder, "ref2", f"f{f:02d}.png"))
    p = os.path.join(folder, cand, f"f{f:03d}.tif") if cand == "ae" else os.path.join(folder, cand, f"f{f:02d}.png")
    if not os.path.exists(p):
        continue
    e = load(p)
    da = np.abs(r[..., 3] - e[..., 3])
    dc = np.abs(over(r) - over(e)).max(-1)
    m = (r[..., 3] > 0) | (e[..., 3] > 0)
    if m.sum() == 0:
        rows.append((f, 100.0, 0, 0, 0)); continue
    sync = (dc[m] <= 2).mean() * 100
    rows.append((f, sync, dc[m].mean(), dc.max(), da.max()))
    if diff_at == f:
        dimg = np.clip(np.abs(over(r) - over(e)) * 8, 0, 255)
        tri = np.concatenate([over(r), over(e), dimg], 1).astype(np.uint8)
        Image.fromarray(tri).save(os.path.join(folder, f"diff_{f}.png"))
for f, s, mean, mx, amx in rows:
    print(f"f{f:3d}  싱크로 {s:6.2f}%  평균차 {mean:5.2f}  최대 {mx:5.0f}  알파최대 {amx:5.0f}")
if rows:
    print("전체 평균 싱크로 %.2f%%, 최저 %.2f%% (f%d)" % (np.mean([r[1] for r in rows]), min(r[1] for r in rows), min(rows, key=lambda r: r[1])[0]))
