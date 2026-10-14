"""포인트 에이전트 — 반응·의성어 자막을 인물 근처(머리 위·턱 밑)로 (2026-10-12 회고 반영, 사용자 승인)

  python fit_person.py split  <clips.json> <배치.json> <out_dir>   → out_dir/band_clips.json(가이드 띠 → fit_guide.py), person_clips.json(인물 근처)
                                                                    정보형 4종(FIXED_TEMPLATES)은 어느 쪽에도 넣지 않음 (만든 위치 그대로)
  python fit_person.py jobs   <out_dir>                            → out_dir/jobs.json (render_solo.jsx 입력, fit_guide.py jobs와 같은 형식)
  .venv/Scripts/python fit_person.py plan <out_dir>                → out_dir/plan.json (apply_guide.jsx 입력) + 표  (얼굴 검출에 OpenCV 필요 → 가상환경)
  .venv/Scripts/python fit_person.py verify <out_dir>              (apply 뒤 a<i>_<j>.png 다시 렌더한 것으로 확인)
- 반응 유형 = plan.py PERSON_TYPES (웃음·놀람·부정·화남). 구간의 who(왼쪽/오른쪽/가운데)가 있으면 그 인물, 없으면 가장 큰 얼굴
- 사용자 최종본(옆구리살) 실측: "(부활)" 라벨은 얼굴 위에 가로 가운데 맞춤, 아래 끝이 얼굴 상자 위 끝 + 13px(얼굴 높이 16%) — 머리에 얹힘
  "땀이.." 얼굴이 화면 위쪽이면 턱 밑(위 끝 = 얼굴 아래 끝 − 얼굴 높이 10%). 크기는 자막 폭이 얼굴 폭의 1.5~1.7배, 큰 템플릿(05_실망)은 597px
- 얼굴을 못 찾거나(고개 숙임 등) 인물이 여럿인데 who가 없으면 "확인 필요"로 표에 남김 (사용자 지정: 애매한 건 작업 전후로 묻기)
얼굴 검출: OpenCV YuNet (models/face_detection_yunet_2023mar.onnx — 한글 경로를 못 읽어서 임시 폴더로 복사해 씀)
"""
import json, os, shutil, sys, tempfile
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import fit_guide  # noqa: E402
sys.stdout.reconfigure(encoding="utf-8")

PERSON_TYPES = {"웃음", "놀람", "부정", "화남"}
# 사용자 종편 레이아웃 그대로 만든 정보형 4종 — 크기·위치를 바꾸지 않음 (가이드 띠 맞추기에서도 뺌, 2026-10-12)
FIXED_TEMPLATES = ("Tip_동작요령_2단", "요령_노랑_2단", "정보바_세트안내", "해설_괄호", "요약_색강조_한줄", "정보바_2줄", "요약_2단_")   # 2026-10-13 목교정기 2종 추가
MAX_W = 600        # 자막 최대 폭 px (사용자 최종본 큰 반응 자막 597px)
MAX_W_FACE = 6.0   # 얼굴 폭의 몇 배까지
MIN_SCALE = 0.6    # 이보다 작게 줄이지 않음 (장식이 큰 의성어 템플릿이 30%대로 줄어 글자가 안 보임 — 2026-10-12 시험)
MARGIN = 40
TOP_SAFE = 120     # 화면 위쪽 소제목·출연자 이름 자리(옆구리살 y 0~110) — 자막 위 끝이 이보다 위로 가지 않게 (2026-10-12 시험: 소제목과 겹침)
MODEL = os.path.join(os.path.dirname(__file__), "..", "..", "models", "face_detection_yunet_2023mar.onnx")


def load(p): return json.load(open(p, encoding="utf-8"))
def save(o, p): json.dump(o, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def split(clips, plan, out):
    C, P = load(clips), load(plan)["points"]
    band, person, fixed = [], [], 0
    for c in C:
        if str(c["name"]).startswith(FIXED_TEMPLATES):
            fixed += 1; continue
        pt = next((p for p in P if abs(p["start"] - c["s"]) < 0.05), None)
        if pt and pt["type"] in PERSON_TYPES:
            person.append(dict(c, n=pt["n"], type=pt["type"], who=pt.get("who", "")))
        else:
            band.append(c)
    os.makedirs(out, exist_ok=True)
    save(band, os.path.join(out, "band_clips.json")); save(person, os.path.join(out, "person_clips.json"))
    print("가이드 띠", len(band), "/ 인물 근처", len(person), "/ 그대로(정보형)", fixed)


def jobs(out):
    fit_guide.jobs(os.path.join(out, "person_clips.json"), out)


def faces(img_path):
    import cv2
    m = os.path.join(tempfile.gettempdir(), "yunet_point.onnx")
    if not os.path.exists(m): shutil.copy(MODEL, m)
    im = cv2.imdecode(np.fromfile(img_path, np.uint8), cv2.IMREAD_COLOR)
    h, w = im.shape[:2]
    det = cv2.FaceDetectorYN.create(m, "", (w, h), 0.7)
    _, F = det.detect(im)
    return [] if F is None else [tuple(int(v) for v in f[:4]) for f in F]   # x, y, w, h


def pick(F, who):
    if not F: return None, "얼굴 못 찾음"
    if who:
        k = {"왼쪽": lambda f: f[0], "오른쪽": lambda f: -f[0], "가운데": lambda f: abs(f[0] + f[2] / 2 - 960)}.get(who)
        if k: return sorted(F, key=k)[0], ""
    big = max(F, key=lambda f: f[2] * f[3])
    return big, ("" if len(F) == 1 else f"인물 {len(F)}명 — who 없음, 가장 큰 얼굴")


def plan(out):
    C = load(os.path.join(out, "person_clips.json")); P = []
    for i, c in enumerate(C):
        _, fb = fit_guide.core(fit_guide.mask(out, i, "c"))
        if fb is None: print(i, c["name"], "자막이 안 보임 — 확인 필요"); continue
        F = faces(os.path.join(out, f"c{i:02d}_0_bg0.png"))
        f, note = pick(F, c.get("who"))
        if f is None: print(i, c["n"], c["name"], "확인 필요:", note, "— 그대로 둠"); continue
        fx, fy, fw, fh = f
        w0, h0 = fb[1] - fb[0] + 1, fb[3] - fb[2] + 1
        k = max(MIN_SCALE, min(1.0, MAX_W / w0, MAX_W_FACE * fw / w0))
        w1, h1 = w0 * k, h0 * k
        cx = fx + fw / 2
        bottom = fy + 0.16 * fh                      # 머리 위에 얹기
        top = bottom - h1; where = "머리 위"
        if top < TOP_SAFE:                            # 위에 자리가 없으면 턱 밑
            top = fy + fh - 0.10 * fh; where = "턱 밑"
        cx = min(max(cx, MARGIN + w1 / 2), 1920 - MARGIN - w1 / 2)
        top = min(max(top, TOP_SAFE), 1080 - MARGIN - h1)
        tcx, tcy = cx, top + h1 / 2
        pcx, pcy = (fb[0] + fb[1]) / 2, (fb[2] + fb[3]) / 2
        d0x, d0y = (c["pos"][0] - 0.5) * 1920, (c["pos"][1] - 0.5) * 1080
        d1x = (960 + d0x - pcx) * k + tcx - 960; d1y = (540 + d0y - pcy) * k + tcy - 540
        P.append(dict(i=i, v=c["v"], s=c["s"], name=c["name"], sc=round(c["sc"] * k, 2),
                      pos=[round(0.5 + d1x / 1920, 5), round(0.5 + d1y / 1080, 5)], face=list(f), where=where, note=note))
        print(i, c["n"], c["name"], f"얼굴 {f} → {where}, 비율 {c['sc']}→{P[-1]['sc']}" + (f"  확인 필요: {note}" if note else ""))
    save(P, os.path.join(out, "plan.json"))
    print(len(P), "clips to set")


def verify(out):
    C = load(os.path.join(out, "person_clips.json")); bad = 0
    for p in load(os.path.join(out, "plan.json")):
        _, fb = fit_guide.core(fit_guide.mask(out, p["i"], "a"))
        fx, fy, fw, fh = p["face"]
        ok = fb is not None and abs((fb[0] + fb[1]) / 2 - (fx + fw / 2)) < max(60, fw) and fb[0] > 3 and fb[1] < 1916 \
            and (fb[3] <= fy + 0.4 * fh or fb[2] >= fy + 0.6 * fh)   # 얼굴 위나 아래 (얼굴 가운데를 덮지 않음)
        bad += 0 if ok else 1
        print(p["i"], C[p["i"]]["name"], p["where"], "자막", fb, "OK" if ok else "확인")
    print("확인 필요", bad)


if __name__ == "__main__":
    {"split": split, "jobs": jobs, "plan": plan, "verify": verify}[sys.argv[1]](*sys.argv[2:])
