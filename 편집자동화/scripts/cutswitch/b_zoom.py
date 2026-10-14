"""컷전환 에이전트 — B캠으로 넘긴 클립을 "말하는 한 사람 클로즈업"으로 확대 (2026-10-13 사용자 승인, 자세교정 최종본 회고)

  .venv/Scripts/python scripts/cutswitch/b_zoom.py <seq.json> <구간.json> <out_dir>
    seq.json : scripts/review/dump_full.jsx 결과 (V1 = B캠: 클립 s·e·in·path·모션)
    구간.json: [[시작초, 끝초, who(선택: 왼쪽/오른쪽/가운데/"")], ...] — B캠이 보이는 구간
    → out_dir/plan.json (scripts/point/apply_guide.jsx 입력: v·s·sc·pos) + 표, 얼굴 확인용 out_dir/b_<시작>.jpg
- 사용자 최종본(자세교정) 한 사람 클로즈업 10곳 실측: 얼굴 높이 = 화면의 13~18%(가운데 15%), 얼굴 가운데 y 0.17~0.25(0.23), x 0.52~0.64(0.57). 확대 139~192%
- 넓은 옆 각도 투샷(인물이 작고 옆모습)은 B캠 후보로 안 씀 — 얼굴이 작아 200%로도 15%에 못 미치면 "확인 필요"
- 원본 화면 밖(검은 테두리)이 보이지 않게 위치를 제한. 얼굴을 못 찾거나 인물이 여럿인데 who가 없으면 "확인 필요"로 묻기
"""
import json, os, shutil, subprocess, sys, tempfile
import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
W, H = 1920, 1080
FACE_H, FACE_X, FACE_Y = 0.15, 0.57, 0.23
K_MIN, K_MAX = 1.3, 2.0
MODEL = os.path.join(os.path.dirname(__file__), "..", "..", "models", "face_detection_yunet_2023mar.onnx")


def frame(path, t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1", "-f", "rawvideo",
                          "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W, 3).copy()


def faces(im):
    import cv2
    m = os.path.join(tempfile.gettempdir(), "yunet_point.onnx")
    if not os.path.exists(m): shutil.copy(MODEL, m)
    d = cv2.FaceDetectorYN.create(m, "", (W, H), 0.7)
    _, F = d.detect(im)
    return [] if F is None else [tuple(float(v) for v in f[:4]) for f in F]


def pick(F, who):
    if not F: return None, "얼굴 못 찾음"
    if who:
        key = {"왼쪽": lambda f: f[0], "오른쪽": lambda f: -f[0], "가운데": lambda f: abs(f[0] + f[2] / 2 - W / 2)}[who]
        return sorted(F, key=key)[0], ""
    big = max(F, key=lambda f: f[3])
    return big, "" if len(F) == 1 else f"인물 {len(F)}명 — who 없음, 가장 큰 얼굴"


def main(seq_json, seg_json, out):
    import cv2
    os.makedirs(out, exist_ok=True)
    d = json.load(open(seq_json, encoding="utf-8"))
    V1 = [c for c in d["video"][0]["clips"] if c.get("path") and "엔딩" not in c["name"]]
    segs = json.load(open(seg_json, encoding="utf-8"))
    plan = []
    for seg in segs:
        a, b = seg[0], seg[1]; who = seg[2] if len(seg) > 2 else ""
        for c in V1:
            lo, hi = max(a, c["s"]), min(b, c["e"])
            if hi - lo < 0.2: continue
            t = (lo + hi) / 2
            im = frame(c["path"], c["in"] + t - c["s"])
            f, note = pick(faces(im), who)
            if f is None:
                print(f"  {t:7.2f}s {c['name']} 확인 필요: {note}"); continue
            fx, fy, fw, fh = f
            k = FACE_H * H / fh
            if k > K_MAX: note = (note + "; " if note else "") + f"얼굴이 작음(높이 {fh/H:.1%}) — 넓은 투샷일 수 있음, B캠 후보 다시 보기"
            k = min(max(k, K_MIN), K_MAX)
            cx, cy = fx + fw / 2, fy + fh / 2
            ox = FACE_X * W - (W / 2 + (cx - W / 2) * k); oy = FACE_Y * H - (H / 2 + (cy - H / 2) * k)
            mx, my = (k - 1) * W / 2, (k - 1) * H / 2           # 화면 밖이 보이지 않는 한계
            ox, oy = min(max(ox, -mx), mx), min(max(oy, -my), my)
            sc = round(k * 100, 1); pos = [round(0.5 + ox / W, 4), round(0.5 + oy / H, 4)]
            plan.append(dict(v=0, s=c["s"], name=c["name"], sc=sc, pos=pos, face=[round(v) for v in f], note=note))
            vis = im.copy(); cv2.rectangle(vis, (int(fx), int(fy)), (int(fx + fw), int(fy + fh)), (0, 255, 0), 4)
            cv2.imencode(".jpg", cv2.resize(vis, (640, 360)))[1].tofile(os.path.join(out, f"b_{c['s']:.2f}.jpg"))
            print(f"  {c['s']:7.2f}s {c['name'][:24]} 얼굴 높이 {fh/H:.1%} → {sc}% 위치 {pos}" + (f"  확인 필요: {note}" if note else ""))
    json.dump(plan, open(os.path.join(out, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(plan), "clips")


if __name__ == "__main__":
    main(*sys.argv[1:4])
