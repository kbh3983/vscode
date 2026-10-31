"""명강의모음 AE판 — 글자 위치(소수점)와 그림자 값을 원본 프레임에 맞추기 (playbook_AE변환: 프레임마다 숫자로 비교)
사용: python fit_point.py <cfg.json> <새 cfg.json> [프레임=60]
1) 그림자 없이 렌더 → 줄마다 위상 상관으로 원본과의 위치 차이(소수점)를 재서 pos 고침 (2회)
2) 원본 알파에서 배경(직선 그라데이션)·글자를 빼고 남은 그림자를 가우시안(흐림 σ, 이동 dx·dy, 불투명도)으로 맞춤
3) AE 그림자로 옮김: 방향 = 위에서 시계방향, 거리 = √(dx²+dy²), 부드럽기 = σ × 4.5 (고딕에서 σ4 ↔ 18이 가장 잘 맞음)"""
import json, os, subprocess, sys
import numpy as np, cv2
from scipy.ndimage import gaussian_filter, shift as nd_shift
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from cmp_lib import load  # noqa
src, dst = sys.argv[1], sys.argv[2]
fr = int(sys.argv[3]) if len(sys.argv) > 3 else 60
c = json.load(open(src, encoding="utf-8"))
F = c["out"]
PLANE = c.get("bg_plane", [-287.764, 0.0054786, 0.463569])


def render(cfg):
    cfg = dict(cfg); cfg["render_range"] = [fr, 1]; cfg["export_mogrt"] = False
    p = os.path.join(F, "cfg_fit.json"); json.dump(cfg, open(p, "w"), ensure_ascii=False)
    subprocess.run([sys.executable, os.path.join(here, "run.py"), p], capture_output=True)
    return load(os.path.join(F, "ae", f"f{fr:03d}.tif"))


ref = load(os.path.join(F, "ref2", f"f{fr:02d}.png"))
texts = [L for L in c["layers"] if L["type"] == "text"]
saved = {L["name"]: L.pop("shadow", None) for L in texts}
for it in range(2):
    e = render(c)
    def ti(a): return (a[..., :3].max(-1) * a[..., 3] / 255).astype(np.float32)
    R, E = ti(ref), ti(e)
    for L in texts:
        y0, y1, x0, x1 = L["roi"]
        (dx, dy), resp = cv2.phaseCorrelate(E[y0:y1, x0:x1], R[y0:y1, x0:x1], cv2.createHanningWindow((x1 - x0, y1 - y0), cv2.CV_32F))
        L["pos"] = [round(L["pos"][0] + dx, 3), round(L["pos"][1] + dy, 3)]
        print(f"{it} {L['name']} 위치 보정 dx {dx:.3f} dy {dy:.3f} → {L['pos']}")
e = render(c)
r, e = ref / 255, e / 255
ys, xs = np.mgrid[0:1080, 0:1920]
Ab = np.clip((PLANE[0] + PLANE[1] * xs + PLANE[2] * ys) / 255, 0, 1)
T = np.clip((e[..., 3] - Ab) / (1 - Ab + 1e-6), 0, 1)
S = np.clip(1 - (1 - r[..., 3]) / ((1 - Ab) * (1 - T) + 1e-6), 0, 1)
y0 = min(L["roi"][0] for L in texts) - 20; y1 = min(1080, max(L["roi"][1] for L in texts) + 40)
x0 = max(0, min(L["roi"][2] for L in texts) - 20); x1 = min(1920, max(L["roi"][3] for L in texts) + 40)
T, S, Abc = T[y0:y1, x0:x1], S[y0:y1, x0:x1], Ab[y0:y1, x0:x1]
valid = (T < 0.02) & (Abc < 0.95)
best = None
for sig in np.arange(1, 8.01, 0.5):
    for dx in np.arange(-2, 9.01, 1):
        for dy in np.arange(-2, 9.01, 1):
            B = gaussian_filter(nd_shift(T, (dy, dx), order=1), sig); x = B[valid]; yv = S[valid]
            if x @ x == 0: continue
            o = (x @ yv) / (x @ x); err = np.mean((o * x - yv) ** 2)
            if best is None or err < best[0]: best = (err, sig, dx, dy, o)
err, sig, dx, dy, o = best
for sig2 in np.arange(sig - 0.5, sig + 0.51, 0.25):
    for dx2 in np.arange(dx - 1, dx + 1.01, 0.5):
        for dy2 in np.arange(dy - 1, dy + 1.01, 0.5):
            B = gaussian_filter(nd_shift(T, (dy2, dx2), order=1), sig2); x = B[valid]; yv = S[valid]
            o2 = (x @ yv) / (x @ x); e2 = np.mean((o2 * x - yv) ** 2)
            if e2 < best[0]: best = (e2, sig2, dx2, dy2, o2)
err, sig, dx, dy, o = best
direction = float(np.degrees(np.arctan2(dx, -dy)) % 360)
sh = {"opacity": round(float(o) * 100, 1), "direction": round(direction, 1), "distance": round(float(np.hypot(dx, dy)), 2), "softness": round(float(sig) * 4.5, 1)}
print("그림자 맞춤", "σ", sig, "dx", dx, "dy", dy, "불투명도", round(o, 3), "rms", round(float(np.sqrt(err)) * 255, 2), "→", sh)
for L in texts: L["shadow"] = sh
json.dump(c, open(dst, "w"), ensure_ascii=False, indent=1)
