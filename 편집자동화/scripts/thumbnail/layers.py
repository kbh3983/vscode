"""썸네일 레이어 나누기 — make_thumb.py / make_thumb2.py 공용
그래픽은 레이어마다 투명 PNG(1920×1080), 글자는 texts.json(포토샵 텍스트 레이어로 만듦 → build_psd.jsx)
"""
import json, os
import numpy as np
from PIL import Image

W, H = 1920, 1080


def new_layer():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def unpremul(lay):
    # 투명 바탕에 색을 마스크로 붙이면 가장자리 색이 검게 섞임 → 알파로 나눠 되돌림
    a = np.asarray(lay).astype(np.float32)
    al = a[..., 3:4] / 255.0
    rgb = np.where(al > 0.004, np.clip(a[..., :3] / np.maximum(al, 0.004), 0, 255), 0)
    return Image.fromarray(np.concatenate([rgb, a[..., 3:4]], axis=2).astype(np.uint8), "RGBA")


def composite(layers):
    # layers = [(이름, RGBA, 혼합)] → 평면 RGB (혼합 "screen" 지원)
    from PIL import ImageChops
    base = layers[0][1].convert("RGB")
    for name, lay, blend in layers[1:]:
        if blend == "screen":
            base = ImageChops.screen(base, lay.convert("RGB"))
        else:
            b = base.convert("RGBA"); b.alpha_composite(lay); base = b.convert("RGB")
    return base


def glyph_bbox(mask):
    return list(mask.getbbox() or (0, 0, 0, 0))


def export(out_dir, layers, texts):
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        if f.endswith(".png") or f == "texts.json": os.remove(os.path.join(out_dir, f))
    meta = []
    for i, (name, lay, blend) in enumerate(layers):
        fn = f"{i:02d}_{name}.png"
        (lay.convert("RGB") if i == 0 else lay).save(os.path.join(out_dir, fn))
        meta.append({"file": fn, "name": name, "blend": blend})
    json.dump({"layers": meta, "texts": texts}, open(os.path.join(out_dir, "texts.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
