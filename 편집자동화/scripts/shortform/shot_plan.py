"""숏폼 에이전트 — A캠 샷사이즈 (1:1 영상 칸 1080×1035) 다시 잡기
  python shot_plan.py <a_segs.json> <원본 프레임 폴더> <out.json>
2026-10-14 사용자: "1:1 화면 기준 A캠은 인물이 정 가운데 있어야 해 머리는 잘리면 안 되고, 필요에 따라 풀샷을 기본으로 니샷, 바스트샷으로 클로즈업 하되, 헤드룸은 늘 있어야해"
- 좌표: A캠 4K 원본을 1920×1080으로 줄인 좌표 = 숏폼소스_샷에서 A 클립을 비율 50·가운데로 놓은 중첩 좌표
- 사람: torchvision Keypoint R-CNN (구간의 15·50·85% 세 프레임, 움직임까지 담도록 상자를 합침)
- 대상: 롱폼에서 보이던 범위(A 클립 비율·위치) 안에 있는 사람
- 샷: 롱폼에서 보이던 높이 Hl 기준 — 대상 몸이 다 보였으면 풀샷(대상 전원), 무릎까지면 니샷, 그보다 좁으면 바스트샷(롱폼 가운데에 가장 가까운 한 사람)
- 헤드룸: 머리 위 7% (창 높이 기준). 카메라 위 끝에 막혀 못 주면 표시
- 가로: 대상(들) 가운데 = 창 가운데
"""
import json, os, sys
import torch
from torchvision.io import read_image
from torchvision.models.detection import keypointrcnn_resnet50_fpn, KeypointRCNN_ResNet50_FPN_Weights

AR = 1080 / 1035            # 영상 칸 가로/세로
HEAD, FOOT = 0.07, 0.03      # 헤드룸, 발 아래 여백
HMIN = 400                   # 너무 크게 확대하지 않음 (4K 원본 800px → 1035, 1.3배)
NOSE, LSH, RSH, LHIP, RHIP, LKN, RKN = 0, 5, 6, 11, 12, 13, 14

model = keypointrcnn_resnet50_fpn(weights=KeypointRCNN_ResNet50_FPN_Weights.DEFAULT).eval().cuda()

CACHE = {}
def people(path):
    if path in CACHE: return CACHE[path]
    img = read_image(path).float().cuda() / 255
    with torch.no_grad(): o = model([img])[0]
    P = []
    for b, s, k in zip(o["boxes"], o["scores"], o["keypoints"]):
        if s < 0.85: continue
        b = b.tolist(); k = k[:, :2].tolist()
        if b[3] - b[1] < 120: continue
        P.append(dict(box=b, kp=k))
    CACHE[path] = P
    return P

def lf_window(j):   # 롱폼에서 보이던 범위 (1920 좌표)
    s = j["clip"]["sc"] / 100; px, py = j["clip"]["pos"]
    x0 = ((0 - px * 1920) / s + 1920) / 2; x1 = ((1920 - px * 1920) / s + 1920) / 2
    y0 = ((0 - py * 1080) / s + 1080) / 2; y1 = ((1080 - py * 1080) / s + 1080) / 2
    return [x0, y0, x1, y1]

def plan(j, frames):
    L = lf_window(j); lcx, lcy = (L[0] + L[2]) / 2, (L[1] + L[3]) / 2; Hl = L[3] - L[1]
    def iou(a, b):
        ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1])); i = ix * iy
        return i / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i)
    tracks = []      # 세 프레임의 사람을 상자 겹침(IoU)으로 묶음 — 위치로만 묶으면 붙어 선 두 사람이 한 명이 됨
    for P in frames:
        for p in P:
            t = max(tracks, key=lambda t: iou(t["ps"][-1]["box"], p["box"]), default=None)
            if t and iou(t["ps"][-1]["box"], p["box"]) > 0.3 and len(t["ps"]) < len(frames): t["ps"].append(p)
            else: tracks.append(dict(ps=[p]))
    sub = []
    for t in tracks:
        bx = [min(p["box"][0] for p in t["ps"]), min(p["box"][1] for p in t["ps"]), max(p["box"][2] for p in t["ps"]), max(p["box"][3] for p in t["ps"])]
        inside = (min(bx[2], L[2]) - max(bx[0], L[0])) / (bx[2] - bx[0])   # 롱폼 창 안에 든 가로 비율 (촬영 스태프 등 제외)
        if inside >= 0.6 and len(t["ps"]) >= min(2, len(frames)):
            kp = t["ps"][len(t["ps"]) // 2]["kp"]
            area = (min(bx[2], L[2]) - max(bx[0], L[0])) * (bx[3] - bx[1])
            sub.append(dict(box=bx, kp=kp, d=-area))
    if not sub: return dict(ok=False, why="사람 못 찾음", L=L)
    # 롱폼 의도: 대상들 몸이 롱폼 창 안에 다 보였는지
    gb = [min(s["box"][0] for s in sub), min(s["box"][1] for s in sub), max(s["box"][2] for s in sub), max(s["box"][3] for s in sub)]
    feet_in = gb[3] <= L[3] + 15
    main = min(sub, key=lambda s: s["d"])   # 롱폼 창 안에서 가장 크게 보이던 사람
    kp = main["kp"]; b = main["box"]
    knee_y = (kp[LKN][1] + kp[RKN][1]) / 2; sh_y = (kp[LSH][1] + kp[RSH][1]) / 2
    knee_in = knee_y <= L[3] + 10
    if feet_in:
        shot = "풀샷"; top_obj, bot_obj = gb[1], gb[3]
        need_h = (bot_obj - top_obj) / (1 - HEAD - FOOT)
        need_w = (gb[2] - gb[0]) * 1.15
        H = max(need_h, need_w / AR); cx = (gb[0] + gb[2]) / 2
        tgt = sub
    else:
        shot = "니샷" if knee_in else "바스트샷"
        bot = knee_y + 0.04 * (b[3] - b[1]) if knee_in else sh_y + 0.75 * (sh_y - b[1])
        H = (bot - b[1]) / (1 - HEAD)
        # 롱폼에서 함께 보이던 사람(상자 60% 이상 롱폼 창 안)은 같이 담고 둘의 가운데로
        tgt = [s for s in sub if min(s["box"][2], L[2]) - max(s["box"][0], L[0]) >= 0.85 * (s["box"][2] - s["box"][0])] or [main]
        if main not in tgt: tgt.append(main)
        tx0, tx1 = min(s["box"][0] for s in tgt), max(s["box"][2] for s in tgt)
        H = max(H, (tx1 - tx0) * 1.15 / AR)
        if len(tgt) > 1: cx = (tx0 + tx1) / 2
        else: cx = (kp[LSH][0] + kp[RSH][0]) / 2 if not knee_in else (kp[LSH][0] + kp[RSH][0] + kp[LHIP][0] + kp[RHIP][0]) / 4
        top_obj = min(s["box"][1] for s in tgt)
    H = min(max(H, HMIN), 1080); W = H * AR
    top = top_obj - HEAD * H
    if shot != "풀샷":   # 둘을 담느라 넓어졌으면 실제 크기로 이름을 다시
        bt = top_obj - HEAD * H + H
        shot = "풀샷" if bt >= b[3] else ("니샷" if bt >= knee_y else "바스트샷")
    flag = []
    if top < 0: flag.append("카메라 위 끝 — 헤드룸 %d%%" % round(100 * (top_obj / H))); top = 0
    if top + H > 1080: top = 1080 - H
    if shot == "풀샷" and gb[3] > top + H + 2: flag.append("발 일부 잘림")
    x0 = min(max(cx - W / 2, 0), 1920 - W)
    if abs((x0 + W / 2) - cx) > 20: flag.append("화면 끝 — 가운데에서 %dpx" % round((x0 + W / 2) - cx))
    return dict(ok=True, shot=shot, n=len(tgt), win=[round(x0, 1), round(top, 1), round(x0 + W, 1), round(top + H, 1)], k=round(1035 / H, 4),
                flag=flag, L=[round(v) for v in L], people=[[round(v) for v in s["box"]] for s in sub])

if __name__ == "__main__":
    J = json.load(open(sys.argv[1], encoding="utf-8")); d = sys.argv[2]; out = []
    cf = os.path.join(d, "_people.json")   # 사람 인식 결과 저장 (기준만 바꿔 다시 돌릴 때 빠르게)
    if os.path.exists(cf): CACHE.update(json.load(open(cf, encoding="utf-8")))
    for j in J:
        fr = [people(os.path.join(d, f"a{j['id']:03d}_{q}.jpg")) for q in range(3) if os.path.exists(os.path.join(d, f"a{j['id']:03d}_{q}.jpg"))]
        r = plan(j, fr); r.update(id=j["id"], name=j["name"]); out.append(r)
        print(j["id"], j["name"], r.get("shot"), r.get("k"), r.get("flag"), r.get("why", ""))
    json.dump(out, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    json.dump(CACHE, open(cf, "w", encoding="utf-8"))
