"""AE판 값 자동 맞춤 — 좌표 하강(값 하나씩 늘리고 줄여 보고, 나아지면 그쪽으로, 아니면 걸음을 반으로)
사용: python optimize.py <cfg.json> <새 cfg.json> <params.json> [프레임=60]
params.json: [{"path": "layers.0.shadows.0.blur", "step": 4, "min": 0, "max": 200}, ...]
목표값: 회색(128) 위 합성 RGB 평균 차이 (그래픽 있는 화소)"""
import json, os, subprocess, sys
import numpy as np
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from cmp_lib import load, over  # noqa
src, dst, pfile = sys.argv[1:4]
fr = int(sys.argv[4]) if len(sys.argv) > 4 else 60
c = json.load(open(src, encoding="utf-8")); P = json.load(open(pfile, encoding="utf-8"))
F = c["out"]; ref = load(os.path.join(F, "ref2", f"f{fr:02d}.png"))


def get(o, path):
    for k in path.split("."): o = o[int(k)] if k.isdigit() else o[k]
    return o


def put(o, path, v):
    ks = path.split(".")
    for k in ks[:-1]: o = o[int(k)] if k.isdigit() else o[k]
    k = ks[-1]
    if k.isdigit(): o[int(k)] = v
    else: o[k] = v


def score(cfg):
    cfg = json.loads(json.dumps(cfg)); cfg["render_range"] = [fr, 1]; cfg["export_mogrt"] = False
    p = os.path.join(F, "cfg_opt.json"); json.dump(cfg, open(p, "w"), ensure_ascii=False)
    subprocess.run([sys.executable, os.path.join(here, "run.py"), p], capture_output=True)
    e = load(os.path.join(F, "ae", f"f{fr:03d}.tif"))
    m = (ref[..., 3] > 0) | (e[..., 3] > 0)
    d = np.abs(over(ref) - over(e)).max(-1)[m]
    return float(d.mean()), float((d <= 2).mean() * 100)


cur, sync = score(c); print("시작", round(cur, 3), round(sync, 2), flush=True)
steps = {p["path"]: p["step"] for p in P}
for rnd in range(int(os.environ.get("ROUNDS", 4))):
    for p in P:
        k = p["path"]
        for sgn in (1, -1):
            while True:
                v0 = get(c, k); v = round(min(p.get("max", 1e9), max(p.get("min", -1e9), v0 + sgn * steps[k])), 3)
                if v == v0: break
                put(c, k, v); s, sy = score(c)
                if s < cur - 1e-4:
                    cur, sync = s, sy; print(f"  {k} = {v}  → {cur:.3f} ({sync:.2f}%)", flush=True)
                else:
                    put(c, k, v0); break
        steps[k] = steps[k] / 2
    json.dump(c, open(dst, "w"), ensure_ascii=False, indent=1)
    print("라운드", rnd + 1, round(cur, 3), round(sync, 2), flush=True)
