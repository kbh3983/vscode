"""숏폼 에이전트 — 장면(조각)마다 정사각 크롭 위치 (1920×1080 롱폼 → 1080×1035 영상 칸)
  python crop.py <shorts.json> <프레임 폴더> → shorts.json 의 pieces[*].crop = {k, cx} (k=비율, cx=가운데 둘 원본 x)
- 조각마다 앞·뒤 2프레임에서 얼굴(YuNet) 찾기 → 얼굴들이 1080/k 폭 안에 들어가면 그 가운데, 안 들어가면 가장 큰 얼굴 기준
- 얼굴을 못 찾으면 사람 실루엣(밝은 배경과 차이 나는 어두운 옷·몸) 가로 무게중심
- k: 기본 1.0 (세로 꽉), 사람 둘이 1080 폭에 안 들어가면 0.958(=1035/1080, 위아래 꽉 맞춤 최소)까지 줄임
"""
import json, os, sys
import shutil, tempfile
import cv2, numpy as np

MODEL = "C:/DADA/9.AI/vscode/편집자동화/models/face_detection_yunet_2023mar.onnx"
_m = os.path.join(tempfile.gettempdir(), "yunet_short.onnx"); shutil.copy(MODEL, _m)   # OpenCV가 한글 경로를 못 읽음
det = cv2.FaceDetectorYN.create(_m, "", (1920, 1080), 0.6, 0.3, 5000)

def faces(img):
    det.setInputSize((img.shape[1], img.shape[0])); _, F = det.detect(img)
    return [] if F is None else [(float(f[0]), float(f[1]), float(f[2]), float(f[3])) for f in F if f[2] > 25]

def body_cx(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    m = g < 90                                   # 검정 옷·머리 (흰 스튜디오 배경)
    m[:, :] &= True
    col = m[100:1000].sum(0).astype(np.float32)
    if col.sum() < 2000: return 960.0
    return float((col * np.arange(1920)).sum() / col.sum())

def decide(imgs):
    F = [f for im in imgs for f in faces(im)]
    if F:
        xs = [f[0] + f[2] / 2 for f in F]; lo, hi = min(f[0] for f in F) - 120, max(f[0] + f[2] for f in F) + 120
        if hi - lo <= 1080: return 1.0, (lo + hi) / 2, "얼굴 %d" % len(F)
        if hi - lo <= 1127: return 0.958, (lo + hi) / 2, "얼굴 %d (조금 줄임)" % len(F)
        big = max(F, key=lambda f: f[2] * f[3]); return 1.0, big[0] + big[2] / 2, "큰 얼굴 기준"
    return 1.0, float(np.mean([body_cx(im) for im in imgs])), "얼굴 없음 → 몸 위치"

def clamp(k, cx):
    half = 1080 / k / 2
    return min(max(cx, half), 1920 - half)

if __name__ == "__main__":
    S = json.load(open(sys.argv[1], encoding="utf-8")); d = sys.argv[2]
    for s in S:
        for i, p in enumerate(s["pieces"]):
            imgs = [cv2.imdecode(np.fromfile(os.path.join(d, f"{s['name']}_p{i}_{j}0.png"), np.uint8), cv2.IMREAD_COLOR) if os.path.exists(os.path.join(d, f"{s['name']}_p{i}_{j}0.png")) else None for j in (0, 1)]
            imgs = [im for im in imgs if im is not None]
            k, cx, why = decide(imgs) if imgs else (1.0, 960.0, "프레임 없음")
            p["crop"] = dict(k=k, cx=round(clamp(k, cx), 1), why=why)
            print(s["name"], i, p["crop"])
    json.dump(S, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
