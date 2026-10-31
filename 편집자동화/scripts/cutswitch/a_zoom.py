"""컷전환 에이전트 — 카메라가 A캠 하나뿐일 때 B캠 대신 A캠 확대로 점프컷 가리기 (2026-10-29 261020_최박사, 사용자 선택 "A캠 확대로 대신")

  .venv/bin/python scripts/cutswitch/a_zoom.py <eps.json> <편 번호> <zones.json> <out_dir>
    eps.json  : 편 시퀀스 V1 클립 [{a,b(프레임),inf(소스 프레임),path,sc,pos}]
    zones.json: 운동 동작 구간 [[파일 이름 일부, 소스 시작초, 소스 끝초], ...] — 동작 중은 덜 확대(전신 가깝게)
  → out/plan.json {razor:[프레임], pieces:[{a,b,sc,pos,kind}]}, 확인용 out/z_<프레임>.jpg (확대된 화면을 원본에서 잘라 만든 그림)
규칙:
- 점프컷 = 소스 시간이 끊기는 V1 경계. 이어지는 조각끼리는 한 덩어리(run)
- 덩어리마다 원래 크기 ↔ 확대를 번갈아 → 점프컷마다 크기가 바뀜 (첫 덩어리 = 원래 크기)
- 1초 미만 덩어리는 앞 덩어리 크기를 이어 씀 (0.3초 확대 깜빡임 방지) — 그 점프컷은 못 가림
- 20초 넘는 덩어리는 8~12초 단위로 나눠 번갈아 (criteria [운동] 반복 구간 번갈아·보조 캠 구간 4~12초)
- 확대: 말하기 1.5배(얼굴 y 0.30), 운동 동작 1.25배(얼굴 y 0.20) — 얼굴 여럿이면 모두 들어오게 줄임(최소 1.15), 화면 밖 검은 테두리 안 보이게 위치 제한
"""
import json, os, shutil, subprocess, sys, tempfile
import numpy as np

FPS = 30000 / 1001
W, H = 1920, 1080
K_TALK, K_MOVE, K_MIN = 1.5, 1.25, 1.15
Y_TALK, Y_MOVE = 0.30, 0.20
MODEL = os.path.join(os.path.dirname(__file__), "..", "..", "models", "face_detection_yunet_2023mar.onnx")


def frame(path, t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1", "-f", "rawvideo",
                          "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W, 3).copy()


def faces(im):
    import cv2
    m = os.path.join(tempfile.gettempdir(), "yunet_point.onnx")
    if not os.path.exists(m): shutil.copy(MODEL, m)
    d = cv2.FaceDetectorYN.create(m, "", (W, H), 0.6)
    _, F = d.detect(im)
    return [] if F is None else [tuple(float(v) for v in f[:4]) for f in F if f[3] > 12]


def place(F, kind):
    k = K_MOVE if kind == "move" else K_TALK
    ty = Y_MOVE if kind == "move" else Y_TALK
    if not F:
        return 1.0, [0.5, 0.5], "얼굴 못 찾음 → 원래 크기"
    x0 = min(f[0] for f in F) / W; x1 = max(f[0] + f[2] for f in F) / W
    y0 = min(f[1] for f in F) / H; y1 = max(f[1] + f[3] for f in F) / H
    if len(F) > 1:
        k = max(K_MIN, min(k, 0.8 / max(x1 - x0, 1e-3)))
    fx, fy = (x0 + x1) / 2, (y0 + y1) / 2
    px = 0.5 - (fx - 0.5) * k
    py = ty - (fy - 0.5) * k
    lo, hi = 1 - k / 2, k / 2
    px, py = min(max(px, lo), hi), min(max(py, lo), hi)
    return k, [round(px, 4), round(py, 4)], f"얼굴 {len(F)}"


def crop_img(im, k, pos, out):
    import cv2
    # 화면 (0..1) 점 s ↔ 원본 점 u: s = pos + (u - 0.5) * k → 화면 왼쪽 위(0,0)의 원본 점
    u0 = 0.5 + (0 - pos[0]) / k; v0 = 0.5 + (0 - pos[1]) / k
    x, y = int(u0 * W), int(v0 * H); w, h = int(W / k), int(H / k)
    c = im[max(0, y):y + h, max(0, x):x + w]
    cv2.imwrite(out, cv2.resize(c, (480, 270)))


def main(eps, ep, zones_p, out):
    os.makedirs(out, exist_ok=True)
    C = json.load(open(eps, encoding="utf-8"))[ep]["clips"]
    Z = json.load(open(zones_p, encoding="utf-8"))
    def kind(c, f):
        t = (c["inf"] + f - c["a"]) / FPS
        return "move" if any(z[0] in c["path"] and z[1] <= t <= z[2] for z in Z) else "talk"
    runs = []   # [시작, 끝, [클립…]]
    for c in C:
        if runs and runs[-1][2][-1]["path"] == c["path"] and runs[-1][2][-1]["inf"] + (runs[-1][2][-1]["b"] - runs[-1][2][-1]["a"]) == c["inf"]:
            runs[-1][1] = c["b"]; runs[-1][2].append(c)
        else:
            runs.append([c["a"], c["b"], [c]])
    pieces, razor, state, nojump = [], [], False, []
    for i, (a, b, cs) in enumerate(runs):
        n = b - a
        if i and n < FPS:
            nojump.append(a)   # 짧은 덩어리 — 앞 크기 그대로
            parts = [(a, b)]
            st = [state]
        else:
            m = int(round(n / FPS / 10)) if n > 20 * FPS else 1
            m = max(1, m)
            edges = [a + round(n * j / m) for j in range(m + 1)]
            parts = list(zip(edges[:-1], edges[1:]))
            razor += edges[1:-1]
            if i: state = not state
            st = []
            for j in range(len(parts)):
                st.append(state)
                if j < len(parts) - 1: state = not state
        for (pa, pb), z in zip(parts, st):
            pieces.append({"a": pa, "b": pb, "zoom": z})
    # 원래 클립 경계로 조각을 다시 나눠(모션은 클립마다) 값 계산
    plan = []
    for p in pieces:
        for c in C:
            lo, hi = max(p["a"], c["a"]), min(p["b"], c["b"])
            if hi <= lo: continue
            mid = (p["a"] + p["b"]) // 2 if p["a"] >= c["a"] and p["b"] <= c["b"] else (lo + hi) // 2
            kd = kind(c, mid)
            if p["zoom"]:
                im = frame(c["path"], (c["inf"] + mid - c["a"]) / FPS)
                k, pos, note = place(faces(im), kd)
                crop_img(im, k, pos, os.path.join(out, f"z_{lo:05d}.jpg"))
            else:
                k, pos, note = 1.0, [0.5, 0.5], ""
            plan.append({"a": lo, "b": hi, "sc": round(k * 100, 1), "pos": pos, "kind": kd, "note": note, "zoom": p["zoom"], "path": c["path"], "mid": (c["inf"] + mid - c["a"]) / FPS})
    # 얼굴 못 찾은 확대 조각(뒤돌기·매달리기) = 같은 파일·같은 종류에서 찾은 값의 중간값 (카메라 고정이라 장면 위치가 같음)
    for q in plan:
        if not q["zoom"] or q["sc"] != 100: continue
        same = [x for x in plan if x["zoom"] and x["sc"] != 100 and x["path"] == q["path"] and x["kind"] == q["kind"]]
        if not same:
            same = [x for x in plan if x["zoom"] and x["sc"] != 100 and x["path"] == q["path"]]
        if same:
            q["sc"] = float(np.median([x["sc"] for x in same])) if q["kind"] == "talk" else K_MOVE * 100
            q["pos"] = [round(float(np.median([x["pos"][0] for x in same])), 4), round(float(np.median([x["pos"][1] for x in same])), 4)]
            k = q["sc"] / 100
            q["pos"] = [min(max(v, 1 - k / 2), k / 2) for v in q["pos"]]
        else:
            q["sc"], q["pos"] = K_MOVE * 100, [0.5, 0.5]
        q["note"] = "얼굴 못 찾음 → 같은 파일 위치"
        crop_img(frame(q["path"], q["mid"]), q["sc"] / 100, q["pos"], os.path.join(out, f"z_{q['a']:05d}.jpg"))
    # 같은 확대 조각이 원래 클립 경계로 나뉘면 같은 값으로 (앞 조각 값)
    for x, y in zip(plan, plan[1:]):
        if x["b"] == y["a"] and x["zoom"] and y["zoom"] and any(p["a"] <= x["a"] and y["b"] <= p["b"] for p in pieces if p["zoom"]):
            y["sc"], y["pos"] = x["sc"], x["pos"]
    for q in plan:
        for key in ("path", "mid", "zoom"): q.pop(key)
    json.dump({"razor": sorted(set(razor)), "plan": plan, "nojump": nojump}, open(os.path.join(out, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    tot = C[-1]["b"]; zf = sum(p["b"] - p["a"] for p in plan if p["sc"] != 100)
    print(f"덩어리 {len(runs)} 점프컷 {len(runs) - 1} (못 가림 {len(nojump)}) 새로 자름 {len(set(razor))} 조각 {len(plan)} 확대 비율 {zf / tot * 100:.1f}%")
    for p in plan:
        print(f"{p['a'] / FPS:7.2f}-{p['b'] / FPS:7.2f} {p['kind']:4} {p['sc']:5} {p['pos']} {p['note']}")


if __name__ == "__main__":
    main(*sys.argv[1:5])
