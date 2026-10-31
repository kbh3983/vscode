"""중앙 포인트 자막 — 등장 흐림(조정 레이어 가우시안)을 프레임마다 원본에 맞추기
사용: python fit_blur.py <cfg.json> <새 cfg.json> <프레임 수> <첫 추정값들(쉼표)>
프레임 k마다 흐림 값 후보를 렌더해 회색 위 합성 평균 차이가 가장 작은 값을 고름 (황금분할 대신 넓게→좁게)"""
import json, os, subprocess, sys
import numpy as np
here = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, here)
from cmp_lib import load, over  # noqa
src, dst, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
est = [float(v) for v in sys.argv[4].split(",")]
c = json.load(open(src, encoding="utf-8")); F = c["out"]
blur = list(est) + [0.0]


def score(k, v):
    cc = json.loads(json.dumps(c)); b = list(blur); b[k] = v; cc["group"]["blur"] = b
    cc["render_range"] = [k, 1]; cc["export_mogrt"] = False
    p = os.path.join(F, "cfg_blur.json"); json.dump(cc, open(p, "w"), ensure_ascii=False)
    subprocess.run([sys.executable, os.path.join(here, "run.py"), p], capture_output=True)
    r = load(os.path.join(F, "ref2", f"f{k:02d}.png")); e = load(os.path.join(F, "ae", f"f{k:03d}.tif"))
    m = (r[..., 3] > 0) | (e[..., 3] > 0)
    return float(np.abs(over(r) - over(e)).max(-1)[m].mean())


for k in range(n):
    v0 = blur[k]; step = max(1.0, v0 * 0.25); best = (score(k, v0), v0)
    while step >= 0.25:
        improved = False
        for v in (best[1] - step, best[1] + step):
            if v < 0: continue
            s = score(k, v)
            if s < best[0]: best = (s, v); improved = True
        if not improved: step /= 2
    blur[k] = round(best[1], 3); print(k, blur[k], round(best[0], 3), flush=True)
c["group"]["blur"] = blur
json.dump(c, open(dst, "w"), ensure_ascii=False, indent=1)
