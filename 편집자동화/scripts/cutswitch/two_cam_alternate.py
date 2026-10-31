"""컷전환 에이전트 — 인터뷰 2캠(V2 정면 A캠 / V1 B캠): 점프컷마다 카메라를 바꾸고, 한 카메라가 길게 이어지면 말 사이 쉼에서 한 번 더 바꿈 (2026-10-31 이효석님)
  .venv/bin/python scripts/cutswitch/two_cam_alternate.py <switch_src.json> <편 키> <out.json>
  switch_src.json: {키: {id, name, V1:[{a,b,inf,path}], V2:[...]}} (프레임)
규칙: 첫 화면 = A캠. 점프컷(V2 소스 시간이 끊기는 곳)마다 바꿈 — 단 직전 화면이 1.5초 미만이면 바꾸지 않음(깜빡임 방지, 그 점프컷은 못 가림).
  한 화면이 MAX_SHOT(25초)을 넘으면 TARGET(약 15초)마다 가장 가까운 말 쉼(0.25초 이상 조용한 곳, ±4초 안)에서 바꿈. B캠 화면은 최대 12초 — 넘으면 A로 돌아옴.
출력: {razor:[프레임], b_ranges:[[a,b]...] (V2를 끌 구간), stats}"""
import json, subprocess, sys
import numpy as np
FPS = 30000 / 1001; SR = 16000
MIN_SHOT, MAX_SHOT, TARGET, B_MAX = 1.5, 25.0, 15.0, 12.0
src, key, out = sys.argv[1:4]
d = json.load(open(src, encoding="utf-8"))[key]
V2 = d["V2"]; END = V2[-1]["b"]
jumps = [y["a"] for x, y in zip(V2, V2[1:]) if not (x["path"] == y["path"] and x["inf"] + (x["b"] - x["a"]) == y["inf"])]
# 말 쉼: V2 클립 소리(A캠)로 최종 타임라인 소리를 만들어 조용한 곳 찾기
cache = {}
def load(p):
    if p not in cache:
        cache[p] = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-af", "pan=mono|c0=c0", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True).stdout, np.float32)
    return cache[p]
aud = np.zeros(int(END / FPS * SR) + SR, np.float32)
for c in V2:
    x = load(c["path"])[int(c["inf"] / FPS * SR):int((c["inf"] + c["b"] - c["a"]) / FPS * SR)]
    s = int(c["a"] / FPS * SR); aud[s:s + len(x)] = x[:len(aud) - s]
fr = int(0.02 * SR); k = len(aud) // fr
db = 20 * np.log10(np.sqrt((aud[:k * fr].reshape(k, fr) ** 2).mean(1)) + 1e-9)
thr = np.percentile(db, 20) + 6
quiet = db < thr; pauses = []; s0 = None
for i, q in enumerate(quiet):
    if q and s0 is None: s0 = i
    if not q and s0 is not None:
        if (i - s0) * 0.02 >= 0.25: pauses.append(((s0 + i) / 2) * 0.02)
        s0 = None
def pause_near(t, lo, hi):
    c = [p for p in pauses if lo < p < hi]
    return min(c, key=lambda p: abs(p - t)) if c else None
# 바꾸는 지점 고르기
switch = []; last = 0.0; cam = "A"; missed = []
bounds = [j / FPS for j in jumps] + [END / FPS]
t_prev = 0.0
for jb in bounds:
    # jb 전까지 긴 화면 나누기
    while True:
        lim = B_MAX if cam == "B" else MAX_SHOT
        if jb - last <= lim + 0.5: break
        want = last + (B_MAX - 2 if cam == "B" else TARGET)
        p = pause_near(want, last + 4, min(jb - 4, last + lim))
        if p is None: p = min(want, jb - 4)
        if p - last < 4: break
        switch.append(p); last = p; cam = "B" if cam == "A" else "A"
    if jb >= END / FPS - 0.01: break
    if jb - last >= MIN_SHOT:
        switch.append(jb); last = jb; cam = "B" if cam == "A" else "A"
    else:
        missed.append(round(jb, 2))
# B 구간
sw = [round(t * FPS) for t in switch]
b_ranges, on = [], False
pts = [0] + sw + [END]
for i in range(len(pts) - 1):
    if i % 2 == 1: b_ranges.append([pts[i], pts[i + 1]])
jf = set(jumps)
razor = sorted(f for f in sw if f not in jf)
bt = sum(b - a for a, b in b_ranges)
shots = [(pts[i + 1] - pts[i]) / FPS for i in range(len(pts) - 1)]
st = {"jumps": len(jumps), "switch": len(sw), "new_cut": len(razor), "missed_jumps": missed, "b_ratio": round(bt / END * 100, 1),
      "shot_med": round(float(np.median(shots)), 1), "shot_max": round(max(shots), 1)}
json.dump({"razor": razor, "b_ranges": b_ranges, "stats": st}, open(out, "w", encoding="utf-8"), ensure_ascii=False)
print(d["name"], st)
