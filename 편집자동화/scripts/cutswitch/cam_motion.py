"""컷전환 에이전트 — 보조 캠 구간이 줌·패닝·흔들림 중인지 (Mac에는 vidstab 필터가 없어서 numpy 위상 상관으로)

  python cam_motion.py <video.json> <트랙 V1|V2> <segments.json> [out.json]
segments.json: [[시작초, 끝초, "이유"], ...]  (시퀀스 시각)
0.2초 간격 프레임(가로 240px, 흑백)을 원본 파일에서 뽑아 앞 프레임과의 이동량(px, 1920 기준 환산)과
가운데·가장자리 이동 차이(줌 추정)를 잰다. 이동량 중앙값이 작고 큰 값이 잠깐인 구간 = 안정.
판정: 초당 이동 > 40px(1920 기준) 이 0.6초 넘게 이어지면 "움직임" → 프레임으로 확인 (손·다리가 화면을 크게 지나가도 오를 수 있음)
2026-10-21 노년필수근육에서 즉석으로 쓰던 방법을 도구로 (2026-10-25)
"""
import json
import os
import subprocess
import sys

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
FF = os.path.join(os.path.dirname(__file__), "..", "..", "bin", "ffmpeg")
FF = FF if os.path.exists(FF) else "ffmpeg"
STEP, W = 0.2, 240
MOVE_PX = 40          # 1920 기준 초당 이동
MOVE_RUN = 0.6        # 이만큼 이어지면 표시


def frames(path, src0, dur):
    h = W * 9 // 16
    raw = subprocess.run([FF, "-v", "error", "-ss", f"{src0:.3f}", "-t", f"{dur:.3f}", "-i", path,
                          "-vf", f"fps={1 / STEP},scale={W}:{h},format=gray", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, W).astype(np.float32)


def shift(a, b):
    win = np.outer(np.hanning(a.shape[0]), np.hanning(a.shape[1]))
    A, B = np.fft.fft2(a * win), np.fft.fft2(b * win)
    r = np.fft.ifft2(A * B.conj() / (np.abs(A * B.conj()) + 1e-9)).real
    y, x = np.unravel_index(np.argmax(r), r.shape)
    y = y - a.shape[0] if y > a.shape[0] // 2 else y
    x = x - a.shape[1] if x > a.shape[1] // 2 else x
    return float(np.hypot(x, y))


def zoomish(a, b):
    """가장자리 띠의 이동 − 가운데 이동 (줌이면 가장자리가 더 움직임)"""
    h, w = a.shape
    e = np.mean([shift(a[:, :w // 4], b[:, :w // 4]), shift(a[:, -w // 4:], b[:, -w // 4:])])
    c = shift(a[h // 4:-h // 4, w // 4:-w // 4], b[h // 4:-h // 4, w // 4:-w // 4])
    return max(0.0, e - c)


def main(vj, track, sj, out=None):
    d = json.load(open(vj, encoding="utf-8"))
    clips = d["tracks"][track]
    rows = []
    for s, e, why in json.load(open(sj, encoding="utf-8")):
        mv, zm = [], []
        for c in clips:
            a, b = max(s, c["start"]), min(e, c["end"])
            if b - a < STEP * 2:
                continue
            fr = frames(c["path"], c["in"] + (a - c["start"]), b - a)
            k = 1920 / W / STEP
            mv += [shift(fr[i - 1], fr[i]) * k for i in range(1, len(fr))]
            zm += [zoomish(fr[i - 1], fr[i]) * k for i in range(1, len(fr))]
        mv, zm = np.array(mv), np.array(zm)
        run = best = 0
        for v in mv:
            run = run + 1 if v > MOVE_PX else 0
            best = max(best, run)
        flag = best * STEP > MOVE_RUN
        rows.append({"s": s, "e": e, "why": why, "move_med": round(float(np.median(mv)), 1) if len(mv) else None,
                     "move_p90": round(float(np.percentile(mv, 90)), 1) if len(mv) else None,
                     "zoom_p90": round(float(np.percentile(zm, 90)), 1) if len(zm) else None,
                     "longest_move_s": round(best * STEP, 1), "check": flag})
        r = rows[-1]
        print(f"{s:7.2f}-{e:7.2f} 이동 중앙 {r['move_med']} p90 {r['move_p90']} 줌 p90 {r['zoom_p90']} 연속 {r['longest_move_s']}초 {'← 프레임 확인' if flag else ''} | {why}")
    if out:
        json.dump(rows, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(*sys.argv[1:5])
