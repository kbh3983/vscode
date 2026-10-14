"""컷편집 에이전트 — edit_decisions.json → Premiere 작업 목록(ops.txt).

ExtendScript가 줄 단위로 읽어 실행한다:
  R|<드롭프레임 타임코드>                 모든 트랙 razor (QE)
  D|<시작 프레임>|<끝 프레임>             그 구간 클립 비활성화
  X|<시작 프레임>|<끝 프레임>             그 구간 클립 지우기 (사용자가 리뷰로 확인한 삭제, 빈 곳은 남김)
  M|<초>|<길이 초>|<마커 색 0~7>|<이름>|<설명>  시퀀스 마커
실행: .venv/Scripts/python scripts/cut/ops.py work/<p>
"""
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

FPS = 30000 / 1001
# 마커 색 번호 (Premiere 마커: 0 녹색 1 빨강 2 보라 3 주황 4 노랑 5 흰색 6 파랑 7 청록)
M_REVIEW, M_JUMP = 4, 1
M_TAKE = {1: 7, 2: 2, 3: 6}


def frame(sec):
    return int(round(sec * FPS))


def df_tc(f):
    """29.97 드롭프레임 타임코드 (HH:MM:SS;FF)."""
    d, m = divmod(f, 17982)
    f += 18 * d + (2 * ((m - 2) // 1798) if m >= 2 else 0)
    return f"{f // 108000:02d}:{f // 1800 % 60:02d}:{f // 30 % 60:02d};{f % 30:02d}"


def main(work):
    out = os.path.join(work, "cut")
    ed = json.load(open(os.path.join(out, "edit_decisions.json"), encoding="utf-8"))
    dels = [d for d in ed["decisions"] if d["action"] == "delete"]
    end_f = frame(max(d["end"] for d in ed["decisions"]))
    cuts, lines = set(), []
    for d in dels:
        cuts |= {frame(d["start"]), frame(d["end"])}
    for g in ed["takes"]:
        for t in g["takes"]:
            cuts |= {frame(t["start"]), frame(t["end"])}
    cuts = sorted(c for c in cuts if 0 < c < end_f)
    lines += [f"R|{df_tc(c)}" for c in cuts]
    lines += [f"{'X' if d.get('confirmed') else 'D'}|{frame(d['start'])}|{frame(d['end'])}" for d in dels]
    for d in ed["decisions"]:
        if d["action"] == "review":
            lines.append(f"M|{d['start']}|{d['end'] - d['start']:.3f}|{M_REVIEW}|확인 필요 {d['task']}|{d['reason']} / {d['text']}")
    for d in dels:   # 점프컷: 지운 구간 뒤에 남은 화면이 이어지는 곳 (시작·끝 C6 제외)
        if d["task"] == "C6" or frame(d["end"]) >= end_f:
            continue
        lines.append(f"M|{frame(d['end']) / FPS:.4f}|0|{M_JUMP}|점프컷 {d['task']}|{d['id']}")
    for g in ed["takes"]:
        for t in g["takes"]:
            lines.append(f"M|{t['start']}|{t['end'] - t['start']:.3f}|{M_TAKE[g['group']]}|테이크 {g['group']}-{t['t']}|{g['content']} / {t['text']}")
    with open(os.path.join(out, "ops.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"razor {len(cuts)}곳, 비활성화 구간 {len(dels)}개, 마커 {sum(l.startswith('M|') for l in lines)}개")


if __name__ == "__main__":
    main(sys.argv[1])
