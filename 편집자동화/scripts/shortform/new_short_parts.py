"""숏폼 에이전트 — 새 숏폼 1개의 V1 조각(카메라 구간별 비율·위치)을 한 번에 (2026-10-16, 틀어진골반_숏폼4)
  python new_short_parts.py <short.json> <cams.json> <작업 폴더>  → <작업 폴더>/parts.json (rebuild_v1.jsx 입력)
short.json = {"name", "longform", "pieces": [[src_in, src_out], …]}  (롱폼 시퀀스 시간, 순서대로 이어 붙임)
- 카메라: cams.json(dump_cams.jsx) — 켜진 V2(A캠)가 있으면 A, 아니면 B
- A캠: 원본 4K에서 구간 15·50·85% 프레임 → shot_plan.plan (풀샷 기본·머리 안 잘림·헤드룸 7%·가운데) → shot_parts.a_motion
- B캠: 원본 프레임에 롱폼 비율·위치(펀치인)를 적용한 1920×1080 → crop.decide (얼굴 가운데, k 1.0/0.958)
- 2프레임 이하 조각은 옆 조각에 붙임 (1프레임 조각은 놓이지 않음)
"""
import json, os, subprocess, sys
import numpy as np, cv2

sys.path.insert(0, os.path.dirname(__file__))
FR = 30000 / 1001
def fr(t): return round(t * FR)

def grab(path, t, out):
    if not os.path.exists(out):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "%.3f" % t, "-i", path, "-frames:v", "1", "-vf", "scale=1920:1080", "-q:v", "3", out], check=True)
    return out

def punch(img, sc, pos):   # 롱폼 클립의 비율·위치를 원본 프레임에 적용 (1920×1080 시퀀스 좌표)
    s = sc / 100; M = np.float32([[s, 0, pos[0] * 1920 - s * 960], [0, s, pos[1] * 1080 - s * 540]])
    return cv2.warpAffine(img, M, (1920, 1080))

if __name__ == "__main__":
    S = json.load(open(sys.argv[1], encoding="utf-8")); C = json.load(open(sys.argv[2], encoding="utf-8"))[S["longform"]]; d = sys.argv[3]
    fd = os.path.join(d, "frames"); os.makedirs(fd, exist_ok=True)
    A = [t for t in C if t["v"] == 2 and t["on"]]; B = [t for t in C if t["v"] == 1 and t["on"]]
    def clip_at(L, t): return next((c for c in L if c["s"] <= t < c["e"]), None)
    segs = []; at = 0
    for pi, (a, b) in enumerate(S["pieces"]):
        f0, f1 = fr(a), fr(b)
        cuts = sorted({f0, f1} | {fr(c[k]) for c in C if c["on"] for k in ("s", "e") if f0 < fr(c[k]) < f1})
        cuts = [c for i, c in enumerate(cuts) if i in (0, len(cuts) - 1) or (c - cuts[i - 1] >= 3 and cuts[-1] - c >= 3)]
        for x, y in zip(cuts, cuts[1:]):
            mid = (x + y) / 2 / FR; ca = clip_at(A, mid)
            segs.append(dict(piece=pi, a=x / FR, b=y / FR, at=at + (x - f0) / FR, cam="A" if ca else "B", clip=ca or clip_at(B, mid)))
        at += (f1 - f0) / FR
    import shot_plan, crop
    def a_motion(p):   # shot_parts.a_motion 과 같음 (shot_parts.py는 불러오면 바로 실행돼서 복사)
        x0, y0, x1, y1 = p["win"]; k = 1035 / (y1 - y0); wx, wy = (x0 + x1) / 2, (y0 + y1) / 2
        return round(k * 100, 3), [round((540 - (wx - 960) * k) / 1080, 5), round((958.5 - (wy - 540) * k) / 1920, 5)]
    R = []
    for i, g in enumerate(segs):
        c = g["clip"]; dur = g["b"] - g["a"]
        if g["cam"] == "A":
            # 4초 넘는 구간은 1초마다 — 세 장면(15·50·85%)만 보면 걷는 시범처럼 움직이는 사람을 놓쳐 화면 끝에 잘림 (틀어진골반_숏폼4 훅)
            qs = (0.15, 0.5, 0.85) if dur <= 4 else [min(0.98, (0.3 + n) / dur) for n in range(int(dur))]
            ims = [grab(c["path"], c["inp"] + (g["a"] + q * dur - c["s"]), os.path.join(fd, "a%02d_%d.jpg" % (i, k))) for k, q in enumerate(qs)]
            p = shot_plan.plan(dict(clip=dict(sc=c["sc"], pos=c["pos"])), [shot_plan.people(x) for x in ims])
            if not p.get("ok"): print(i, "A 사람 못 찾음 → 롱폼 그대로"); p = None
            sc, pos = a_motion(p) if p else (round(c["sc"] * 2 * 1035 / 1080, 3), [0.5, 958.5 / 1920])
            why = (p["shot"] + " " + " ".join(p["flag"])) if p else "롱폼"
        else:
            ims = [punch(cv2.imdecode(np.fromfile(grab(c["path"], c["inp"] + (g["a"] + q * dur - c["s"]), os.path.join(fd, "b%02d_%d.jpg" % (i, k))), np.uint8), cv2.IMREAD_COLOR), c["sc"], c["pos"]) for k, q in enumerate((0.1, 0.9))]
            k_, cx, why = crop.decide(ims); cx = crop.clamp(k_, cx)
            sc, pos = round(k_ * 100, 3), [round((540 + (960 - cx) * k_) / 1080, 5), round(958.5 / 1920, 5)]
        R.append(dict(a=round(g["a"], 5), b=round(g["b"], 5), at=round(g["at"], 5), sc=sc, pos=pos, cam=g["cam"]))
        print(i, g["cam"], "%.2f-%.2f → %.2f" % (g["a"], g["b"], g["at"]), sc, pos, why)
    json.dump(R, open(os.path.join(d, "parts.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print("조각", len(R), "길이 %.2f" % at)
