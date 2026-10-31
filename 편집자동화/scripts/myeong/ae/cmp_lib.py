"""명강의모음 AE판 비교 공통 — 프레임 읽기(AE TIFF 알파·미리 곱한 색 처리), 회색 위 합성"""
import os, subprocess
import numpy as np
from PIL import Image

FF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "bin", "ffmpeg")


def load(p):
    if p.endswith(".tif"):   # PIL은 AE TIFF의 알파를 버림 → ffmpeg로 RGBA
        raw = subprocess.run([FF, "-v", "error", "-i", p, "-f", "rawvideo", "-pix_fmt", "rgba", "-"], capture_output=True).stdout
        a = np.frombuffer(raw, np.uint8).reshape(1080, 1920, 4).astype(np.float32)
        al = a[..., 3:4]   # AE "알파가 포함된 TIFF"는 미리 곱한(premultiplied) 색 → 프리미어 PNG처럼 곧은(straight) 색으로
        a[..., :3] = np.where(al > 0, np.clip(a[..., :3] * 255 / np.maximum(al, 1), 0, 255), 0)
        return a
    return np.array(Image.open(p).convert("RGBA")).astype(np.float32)


def over(a, bg=128.0):
    al = a[..., 3:4] / 255
    return a[..., :3] * al + bg * (1 - al)
