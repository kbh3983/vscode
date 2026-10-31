"""컷전환 에이전트 — 인터뷰 2캠, B캠 비율 목표에 맞춰 짧은 B캠으로 점프컷 가리기 (2026-10-31 이효석님, 사용자: "b캠 비율을 20%로 낮춰줘")
  .venv/bin/python scripts/cutswitch/two_cam_ratio.py <switch_src.json> <편 키> <out.json> [목표 비율=20]
규칙: 기본 A캠. 점프컷에서 B캠으로 넘어가고(직전 A 화면 1.5초 이상일 때), B_LEN초쯤 뒤 가장 가까운 말 쉼에서 A로 돌아옴.
  B 화면 중에 점프컷이 오면 그 점프컷에서 A로 돌아옴(가려짐). A 화면이 MAX_A초를 넘으면 말 쉼에서 B_LEN짜리 B를 하나 끼움.
  B_LEN(4~8초)·MAX_A(25~90초)를 바꿔 가며, 목표 ±1% 안에서 가장 긴 화면이 가장 짧은 조합 (없으면 목표에 가장 가까운 조합)."""
import json, subprocess, sys
import numpy as np
FPS = 30000 / 1001; SR = 16000; MIN_SHOT = 1.5
src, key, out = sys.argv[1:4]; TARGET = float(sys.argv[4]) if len(sys.argv) > 4 else 20.0
d = json.load(open(src, encoding="utf-8"))[key]
V2 = d["V2"]; END = V2[-1]["b"] / FPS
jumps = [y["a"] / FPS for x, y in zip(V2, V2[1:]) if not (x["path"] == y["path"] and x["inf"] + (x["b"] - x["a"]) == y["inf"])]
cache = {}
def load(p):
    if p not in cache:
        cache[p] = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-af", "pan=mono|c0=c0", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True).stdout, np.float32)
    return cache[p]
aud = np.zeros(int(END * SR) + SR, np.float32)
for c in V2:
    x = load(c["path"])[int(c["inf"] / FPS * SR):int((c["inf"] + c["b"] - c["a"]) / FPS * SR)]
    s = int(c["a"] / FPS * SR); aud[s:s + len(x)] = x[:len(aud) - s]
fr = int(0.02 * SR); k = len(aud) // fr
db = 20 * np.log10(np.sqrt((aud[:k * fr].reshape(k, fr) ** 2).mean(1)) + 1e-9)
quiet = db < np.percentile(db, 20) + 6; pauses = []; s0 = None
for i, q in enumerate(quiet):
    if q and s0 is None: s0 = i
    if not q and s0 is not None:
        if (i - s0) * 0.02 >= 0.25: pauses.append(((s0 + i) / 2) * 0.02)
        s0 = None
P = np.array(pauses)
def pause_near(t, lo, hi):
    c = P[(P > lo) & (P < hi)]
    return float(c[np.argmin(np.abs(c - t))]) if len(c) else None

def simulate(BL, MA):
    sw = []; cam = "A"; last = 0.0; missed = []; ji = 0; t = 0.0
    J = jumps + [END]
    while True:
        nj = J[ji] if ji < len(J) else END
        if cam == "A":
            if nj - last > MA:   # 긴 A → 말 쉼에서 B 끼우기
                p = pause_near(last + MA * 0.8, last + 6, nj - BL - 1)
                if p is not None:
                    sw.append(p); cam = "B"; last = p; continue
            if nj >= END - 0.01: break
            if nj - last >= MIN_SHOT: sw.append(nj); cam = "B"; last = nj
            else: missed.append(round(nj, 2))
            ji += 1
        else:
            p = pause_near(last + BL, last + max(2.0, BL - 2), last + BL + 2)
            if nj <= (p if p is not None else last + BL + 2) and nj < END - 0.01:
                if nj - last >= MIN_SHOT: sw.append(nj); cam = "A"; last = nj; ji += 1; continue
                missed.append(round(nj, 2)); ji += 1; continue
            if p is None: p = last + BL
            if p >= END - 0.5: break
            sw.append(p); cam = "A"; last = p
    pts = [0.0] + sw + [END]
    b = [(pts[i], pts[i + 1]) for i in range(1, len(pts) - 1, 2)]
    ratio = sum(y - x for x, y in b) / END * 100
    shots = np.diff(pts)
    return ratio, sw, b, missed, shots

best = None
for BL in np.arange(4.0, 8.01, 0.5):   # B캠 한 번 4초 이상 (criteria 보조 캠 구간 4~12초)
    for MA in (25, 30, 40, 50, 60, 75, 90):
        r, sw, b, missed, shots = simulate(BL, MA)
        score = (0, round(float(shots.max()), 1), abs(r - TARGET)) if abs(r - TARGET) <= 1.0 else (1, abs(r - TARGET), 0)   # 목표 ±1 안이면 가장 긴 화면이 짧은 조합
        if best is None or score < best[0]: best = (score, BL, MA, r, sw, b, missed, shots)
_, BL, MA, r, sw, b, missed, shots = best
swf = [round(t * FPS) for t in sw]; jf = {round(j * FPS) for j in jumps}
b_ranges = [[round(x * FPS), round(y * FPS)] for x, y in b]
hidden = sum(1 for j in jumps if round(j * FPS) in set(swf))
st = {"B_LEN": float(BL), "MAX_A": MA, "b_ratio": round(r, 1), "jumps": len(jumps), "jumps_hidden": hidden, "switch": len(sw),
      "new_cut": len([f for f in swf if f not in jf]), "shot_med": round(float(np.median(shots)), 1), "shot_max": round(float(shots.max()), 1),
      "b_med": round(float(np.median([y - x for x, y in b])), 1) if b else 0}
json.dump({"razor": sorted(f for f in swf if f not in jf), "b_ranges": b_ranges, "stats": st}, open(out, "w", encoding="utf-8"), ensure_ascii=False)
print(d["name"], st)
