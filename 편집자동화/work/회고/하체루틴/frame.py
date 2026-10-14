"""회고용 — 시퀀스 덤프(JSON)로 특정 시각의 영상 화면을 원본에서 다시 그린다 (A캠 V2가 켜져 있으면 A캠, 아니면 B캠 V1).
모션(비율·위치)을 적용해 1920x1080에 놓는다. 그래픽·자막은 그리지 않는다.
사용: from frame import render; render(seq_json_dict, t, out_png, label)
"""
import json, os, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
FONT = ImageFont.truetype(r"C:\Windows\Fonts\malgun.ttf", 34)


def motion(c):
    for x in c["c"]:
        if x["m"] == "AE.ADBE Motion":
            d = {p[1]: p[2] for p in x["p"]}
            return d["비율 조정"], d["위치"]
    return 100, [0.5, 0.5]


def clip_at(d, t):
    for vi in (1, 0):
        for c in d["video"][vi]["clips"]:
            if c["s"] - 1e-3 <= t < c["e"] and not c["off"]:
                return c
    return None


def render(d, t, out, label=""):
    c = clip_at(d, t)
    canvas = Image.new("RGB", (W, H), (20, 20, 20))
    info = "없음"
    if c:
        src_t = c["in"] + (t - c["s"])
        with tempfile.TemporaryDirectory() as td:
            p = os.path.join(td, "f.png")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{src_t:.3f}", "-i", c["path"], "-frames:v", "1", p], check=True)
            im = Image.open(p).convert("RGB")
        sc, pos = motion(c)
        w, h = int(im.width * sc / 100), int(im.height * sc / 100)
        im = im.resize((w, h), Image.BILINEAR)
        canvas.paste(im, (int(pos[0] * W - w / 2), int(pos[1] * H - h / 2)))
        cam = "A캠" if c["name"].startswith("C00") else "B캠"
        info = f"{cam} {sc:g}% y{pos[1]:.3f}"
    dr = ImageDraw.Draw(canvas)
    dr.rectangle([0, 0, W, 50], fill=(0, 0, 0))
    dr.text((10, 5), f"{label}  {int(t // 60)}:{t % 60:05.2f}  {info}", font=FONT, fill=(255, 255, 0))
    canvas.save(out)
    return info
