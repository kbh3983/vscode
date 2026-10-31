"""AE 확인 프레임(알파 곱한 PNG)을 레퍼런스 배경 위에 얹어 원본과 나란히 (놀심 템플릿, 2026-10-28)
사용: compare_check.py <출력 jpg> <AE png> <배경 png> <원본 png> [<AE png> <배경 png> <원본 png> ...]"""
import sys, numpy as np
from PIL import Image
def over(fg, bg):
    a = np.asarray(Image.open(fg).convert("RGBA")).astype(float); b = np.asarray(Image.open(bg).convert("RGB")).astype(float)
    al = a[:, :, 3:4] / 255
    return Image.fromarray(np.clip(a[:, :, :3] + b * (1 - al), 0, 255).astype(np.uint8))   # AE PNG는 알파를 곱한 값
out, rest = sys.argv[1], sys.argv[2:]
rows = [rest[i:i + 3] for i in range(0, len(rest), 3)]
sh = Image.new("RGB", (1920, 300 * len(rows)), "black")
for k, (fg, bg, ref) in enumerate(rows):
    sh.paste(over(fg, bg).crop((0, 760, 1920, 1060)).resize((960, 150)), (0, k * 300))
    sh.paste(Image.open(ref).convert("RGB").crop((0, 760, 1920, 1060)).resize((960, 150)), (960, k * 300))
    sh.paste(over(fg, bg).crop((560, 800, 1360, 1040)), (0, k * 300 + 150 - 0) if False else (0, k * 300 + 150))
    sh.paste(Image.open(ref).convert("RGB").crop((560, 800, 1360, 1040)), (960, k * 300 + 150))
sh.save(out, quality=88)
