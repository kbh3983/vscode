"""색보정 에이전트 — 시퀀스 전체 일괄 처리 (agents/색보정/playbook_화이트밸런스.md).

  plan <video.json>                    원본 파일에서 V2·V1 흰 배경을 재서 처음 값 계산 → <이름>_plan.json
  match <video.json> <ref.mp4> <cur.mp4> <values.json>
                                       V1이 보이는 클립마다 같은 순간의 V2(ref)와 V1(cur)을 비교 → 다음 값 (values_next.json)
  check <video.json> <final.mp4>       최종 렌더에서 V2 보이는 곳·V1 보이는 곳 흰 배경 무채색·밝기·검정 요약

video.json: ExtendScript로 저장한 {"name","id","end","tracks":{"V1":[{name,start,end,in,path,disabled}],...}}
렌더: 시퀀스 전체를 `00 - Match Source - High bitrate.epr`(H.264)로 내보낸 mp4
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import img  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")

# 승인된 측정값 (log/2026-10-09.md)
K_TEMP_V2 = 1.23      # C캠, 채도 100: 온도 +1당 흰 배경 R−B
K_TINT = -0.92        # 색조 +1당 G−(R+B)/2
K_TEMP_V1 = 1.8       # B캠, 채도 115
K_EXPO = 34.0         # 노출 1당 흰 배경 밝기
K_BLACK = 0.9         # 검정 1당 어두운 5% (어두운 영역 0)
# 2026-10-13 사용자 승인 (목교정기 최종본 회고): B캠은 A캠보다 밝지 않게, 바닥·벽 기준. 같은 장면 B캠은 한 값
FLOOR_GAP = 15        # B캠 "흰 면" 밝기가 A캠 벽보다 이만큼 이상 어두우면 바닥(클로즈업)으로 보고 노출을 올리지 않음
SCENE_GAP = 5.0       # B캠 클립 사이 원본 시간 빈틈이 이보다 작으면 같은 장면 → 값 묶음(중간값)
SCENE_EXPO, SCENE_TEMP = 0.2, 1.5   # 이어진 클립이라도 계산 값이 이만큼 넘게 다르면 다른 장면(화각·밝기가 바뀜) — 틀어진골반 1회차 77클립이 10묶음으로 뭉쳐서 추가 (2026-10-13)
# 승인된 30초 결과의 B캠 기준값 (옆구리살, 가려진 클립에 넣은 중간값)과 그때의 원본 흰 배경 R−B
V1_BASE = {"14": -13.6, "15": 2.7, "16": 100, "19": 0.21, "22": 0, "24": -8}
V1_BASE_SRC_RB = 16.3
CAM = ("C0", "20260908_B_CAM")   # V2, V1 카메라 파일 이름 앞부분


def is_cam(c):
    return os.path.basename(c["name"]).startswith(CAM) and "엔딩" not in c["name"]


def mid(c):
    return (c["start"] + c["end"]) / 2


def src_frame(c, t):
    return img.frame_from_video(c["path"], c["in"] + (t - c["start"]))


def wall_of(im):
    w, frac = img.bg_auto(im)
    return w, frac


# 2026-10-12 사용자 지정: A캠·B캠 전체 클립 보정 (컷전환을 나중에 사용자가 바꾸므로). COLOR_ALL=0 이면 예전처럼 보이는 V1만
ALL = os.environ.get("COLOR_ALL", "1") == "1"


def visible_v1(d):
    """보정할 V1 카메라 클립. 기본(ALL)은 전체, COLOR_ALL=0이면 V2가 꺼진(또는 비어 있는) 구간의 V1만.
    전체 모드의 match에서 cur 렌더는 'V2를 모두 끈' 임시 시퀀스(V1 전체가 보이는 화면)여야 한다."""
    v2 = d["tracks"].get("V2", [])
    out = []
    if ALL:
        return [(i, c) for i, c in enumerate(d["tracks"]["V1"]) if is_cam(c)]
    for i, c in enumerate(d["tracks"]["V1"]):
        if not is_cam(c):
            continue
        t = mid(c)
        cover = [x for x in v2 if x["start"] <= t < x["end"] and not x["disabled"]]
        if not cover:
            out.append((i, c))
    return out


def plan(path):
    d = json.load(open(path, encoding="utf-8"))
    v2 = [c for c in d["tracks"]["V2"] if is_cam(c) and (ALL or not c["disabled"])]
    pick = v2[:: max(1, len(v2) // 10)][:10]
    rb, gm = [], []
    for c in pick:
        w, frac = wall_of(src_frame(c, mid(c)))
        if frac < 0.15:
            continue
        rb.append(w[0] - w[2])
        gm.append(w[1] - (w[0] + w[2]) / 2)
    v2t, v2c = round(-np.median(rb) / K_TEMP_V2, 1), round(-np.median(gm) / K_TINT, 1)
    v1all = [c for c in d["tracks"]["V1"] if is_cam(c)]
    pick1 = v1all[:: max(1, len(v1all) // 10)][:10]
    rb1 = []
    for c in pick1:
        w, frac = wall_of(src_frame(c, mid(c)))
        if frac >= 0.15:
            rb1.append(w[0] - w[2])
    v1 = dict(V1_BASE)
    v1["14"] = round(V1_BASE["14"] - (np.median(rb1) - V1_BASE_SRC_RB) / K_TEMP_V1, 1)
    vis = visible_v1(d)
    p = {"name": d["name"], "v2": {"14": v2t, "15": v2c}, "v2_src_rb": round(float(np.median(rb)), 1),
         "v2_src_gm": round(float(np.median(gm)), 1), "v1_base": v1, "v1_src_rb": round(float(np.median(rb1)), 1),
         "v1_visible": [{"index": i, "start": round(c["start"], 3), "end": round(c["end"], 3), "t": round(mid(c), 3)} for i, c in vis]}
    json.dump(p, open(path.replace("_video.json", "_plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{d['name']}: V2 원본 흰 배경 R−B {p['v2_src_rb']:+.1f} G−중간 {p['v2_src_gm']:+.1f} → 온도 {v2t} 색조 {v2c} | "
          f"V1 원본 R−B {p['v1_src_rb']:+.1f} → 기준 온도 {v1['14']} | V1 보이는 클립 {len(vis)}개")


def frame_at(mp4, t):
    return img.frame_from_video(mp4, t)


def match(path, ref, cur, vals_path):
    d = json.load(open(path, encoding="utf-8"))
    vals = json.load(open(vals_path, encoding="utf-8"))
    nxt = {}
    for i, c in visible_v1(d):
        t = mid(c)
        a, b = img.stats(frame_at(cur, t)), img.stats(frame_at(ref, t))
        v = vals.get(str(i))
        w = a["wall"]
        rb, gm = w[0] - w[2], w[1] - (w[0] + w[2]) / 2
        dl, db = b["wall_luma"] - a["wall_luma"], b["black_p5"] - a["black_p5"]
        n = dict(v)
        n["14"] = round(v["14"] - rb / K_TEMP_V1, 1)
        n["15"] = round(v["15"] - gm / K_TINT, 1)
        up = float(np.clip(dl / K_EXPO, -0.3, 0.3))
        # A캠보다 밝게 하지 않음: 노출을 올린 뒤 밝은 쪽(95%)이 A캠 95%를 넘지 않게. 흰 면이 바닥이면(A캠 벽보다 FLOOR_GAP 이상 어두움) 올리지 않음
        # (목교정기 1:28~2:26 누운 출연자 클로즈업 — 바닥을 벽에 맞춰 노출 0.7~0.8, 사용자가 0.4로 내림)
        if up > 0:
            if dl >= FLOOR_GAP:
                up = 0.0
            else:
                up = min(up, max(0.0, (b["p95"] - a["p95"]) / K_EXPO))
        n["19"] = round(v["19"] + up, 2)
        # 두 화면 모두에 검은 부분(어두운 5%가 30 이하)이 있을 때만 검정을 맞춘다 — 한쪽에 검은 옷이 안 보이면 비교가 안 됨
        black_ok = b["black_p5"] <= 30 and a["black_p5"] <= 30 or (a["black_p5"] > 30 and b["black_p5"] <= 30)
        # V1 어두운 5%가 5 미만 = 가까이 잡은 검은 옷이 0으로 눌린 것 → 검정을 올리면 뜨기만 함, 맞추지 않음
        if a["black_p5"] < 5:
            black_ok = False
        if black_ok:
            n["24"] = round(v["24"] + float(np.clip(db / K_BLACK, -10, 10)), 1)
        else:
            db = 0.0
        nxt[str(i)] = n
        ok = abs(rb) <= 1.5 and abs(gm) <= 1.5 and abs(dl) <= 3 and abs(db) <= 3
        print(f"V1[{i:3d}] {c['start']:7.2f}s 벽 R−B {rb:+.0f} G−중간 {gm:+.1f} 밝기 {a['wall_luma']:.0f}/{b['wall_luma']:.0f} "
              f"검정 {a['black_p5']:.0f}/{b['black_p5']:.0f} {'✓' if ok else ''}")
    json.dump(nxt, open(vals_path.replace(".json", "_next.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("다음: (필요하면 fixblack.py) → batch.py group <video.json> <_next.json>")


def group(path, vals_path):
    """match(·fixblack) 뒤에 따로 실행 — 같은 장면 B캠 클립을 한 값으로"""
    d = json.load(open(path, encoding="utf-8")); v = json.load(open(vals_path, encoding="utf-8"))
    group_scenes(d, v)
    json.dump(v, open(vals_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def group_scenes(d, nxt):
    """같은 장면(같은 B캠 파일, 원본 시간이 SCENE_GAP 안으로 이어짐) 클립은 온도·색조·노출·검정을 중간값 하나로 (2026-10-13 사용자 승인)"""
    V1 = d["tracks"]["V1"]
    keys = sorted((int(k) for k in nxt), key=lambda i: V1[i]["in"])
    groups, cur = [], []
    for i in keys:
        c = V1[i]
        if cur:
            p = V1[cur[-1]]
            med = lambda k: float(np.median([nxt[str(j)][k] for j in cur]))
            jump = abs(nxt[str(i)]["19"] - med("19")) > SCENE_EXPO or abs(nxt[str(i)]["14"] - med("14")) > SCENE_TEMP
            if c["name"] != p["name"] or c["in"] - (p["in"] + p["end"] - p["start"]) > SCENE_GAP or jump:
                groups.append(cur); cur = []
        cur.append(i)
    if cur:
        groups.append(cur)
    for g in groups:
        if len(g) < 2:
            continue
        for k in ("14", "15", "19", "24"):
            vals = [nxt[str(i)][k] for i in g if k in nxt[str(i)]]
            if vals:
                m = round(float(np.median(vals)), 2)
                for i in g:
                    # 노출: 중간값으로 묶되 제 값이 더 어두운 클립은 제 값 — 중간값만 쓰면 일부가 A캠보다 밝아지고(틀어진골반 15클립 +4~7),
                    # 가장 어두운 값으로 묶으면 바닥 클로즈업에 끌려 다른 클립이 13~14 어두워짐 (2026-10-13)
                    nxt[str(i)][k] = min(m, nxt[str(i)][k]) if k == "19" else m
    print(f"장면 묶음 {sum(1 for g in groups if len(g) > 1)}개 (클립 {sum(len(g) for g in groups if len(g) > 1)}개를 한 값으로)")


def check(path, final):
    d = json.load(open(path, encoding="utf-8"))
    v2 = [c for c in d["tracks"]["V2"] if is_cam(c) and not c["disabled"]]
    rows = []
    for c in v2[:: max(1, len(v2) // 12)]:
        w, frac = wall_of(frame_at(final, mid(c)))
        if frac > 0.15:
            rows.append((w[0] - w[2], w[1] - (w[0] + w[2]) / 2))
    rows = np.array(rows)
    print(f"{d['name']}: V2 {len(rows)}곳 흰 배경 R−B 중앙 {np.median(rows[:, 0]):+.1f} (최대 {np.abs(rows[:, 0]).max():.1f}), "
          f"G−중간 중앙 {np.median(rows[:, 1]):+.1f}")


if __name__ == "__main__":
    {"plan": plan, "match": match, "check": check, "group": group}[sys.argv[1]](*sys.argv[2:])
