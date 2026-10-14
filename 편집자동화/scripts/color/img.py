"""색보정 에이전트 — 이미지 읽기·배경 측정 (PIL 없이 ffmpeg 사용)."""
import subprocess

import numpy as np

W, H = 1920, 1080
# 사람이 서 있지 않은 양쪽 벽 (1920x1080 기준). 영상마다 확인 필요
BG_BOXES = [(60, 440, 80, 880), (1460, 1860, 80, 880)]


def read_rgb(path, w=W, h=H):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3).astype(float)


def frame_from_video(path, t, w=W, h=H):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", path, "-frames:v", "1", "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3).astype(float)


def bg(im, boxes=BG_BOXES):
    p = np.concatenate([im[y0:y1, x0:x1].reshape(-1, 3) for x0, x1, y0, y1 in boxes])
    return p.mean(0)


def wall_mask(im, min_luma=130, max_chroma=45):
    """밝고(루마 > min_luma) 색이 옅은(최대−최소 < max_chroma) 픽셀 = 벽. 검은 옷·피부는 빠진다."""
    luma = im @ np.array([0.2126, 0.7152, 0.0722])
    chroma = im.max(2) - im.min(2)
    return (luma > min_luma) & (chroma < max_chroma)


def bg_auto(im):
    m = wall_mask(im)
    return np.median(im[m], axis=0), float(m.mean())


def skin(im):
    """피부: R > G > B, 적당히 밝고 색이 있음."""
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    luma = im @ np.array([0.2126, 0.7152, 0.0722])
    m = (r > g) & (g > b) & (r - g > 20) & (r - b > 25) & (luma > 70) & (luma < 225) & (r - b < 110)
    return np.median(im[m], axis=0) if m.sum() > 500 else None, float(m.mean())


def stats(im):
    """비교용 수치: 벽 색·밝기, 피부 색, 어두운 쪽(검은 옷) 밝기, 전체 채도."""
    luma = im @ np.array([0.2126, 0.7152, 0.0722])
    w, wf = bg_auto(im)
    s, sf = skin(im)
    sat = (im.max(2) - im.min(2))
    return {"wall": w, "wall_luma": float(w @ np.array([0.2126, 0.7152, 0.0722])),
            "skin": s, "black_p5": float(np.percentile(luma, 5)), "black_p20": float(np.percentile(luma, 20)),
            "p95": float(np.percentile(luma, 95)), "wall_frac": wf,
            "sat_med": float(np.median(sat[luma > 60]))}


def show(name, st):
    w, s = st["wall"], st["skin"]
    sk = f"피부 ({s[0]:.0f},{s[1]:.0f},{s[2]:.0f}) R−G {s[0] - s[1]:+.0f} G−B {s[1] - s[2]:+.0f}" if s is not None else "피부 -"
    return (f"{name:14s} 벽 ({w[0]:.0f},{w[1]:.0f},{w[2]:.0f}) 밝기 {st['wall_luma']:.0f} | {sk} | "
            f"검정 p5 {st['black_p5']:.0f} p20 {st['black_p20']:.0f} | 채도 {st['sat_med']:.0f}")


def describe(m):
    return f"RGB ({m[0]:.1f}, {m[1]:.1f}, {m[2]:.1f})  R−B {m[0] - m[2]:+.1f}  G−B {m[1] - m[2]:+.1f}"
