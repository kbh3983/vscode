"""교양 에이전트 — 레퍼런스 그림을 프리미어 배치 그대로 두고 여백 채워 새로 그리기 (Flex.1-alpha) (2026-10-19)
사용자: "시퀀스에 12초 이미지, v5 트랙에 올린 레퍼런스 토대로 새로 그려줘. 느낌 거의 비슷하게, 샷사이즈는 지금 그대로에 여백만 배경으로 채워서 그려줘."
  python outpaint_redraw.py <레퍼런스> <출력 폴더> <가운데x> <가운데y> <크기%> "<프롬프트>" [지울 상자 x0,y0,x1,y1 (레퍼런스 좌표)] [다시 그리기 세기=0.42] [씨앗=3]
1) 1920×1080 화면에 프리미어와 같은 자리·크기로 놓음 → 2) 빈 여백 + 지울 상자를 인페인트로 채움 → 3) 전체를 낮은 세기로 다시 그려 고해상도로
"""
import sys, os
import torch
from PIL import Image, ImageDraw, ImageFilter
from diffusers import FluxInpaintPipeline, FluxImg2ImgPipeline

ref, outd, cx, cy, sc, prompt = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
erase = [int(v) for v in sys.argv[7].split(",")] if len(sys.argv) > 7 and sys.argv[7] else None
st2 = float(sys.argv[8]) if len(sys.argv) > 8 else 0.42
seed = int(sys.argv[9]) if len(sys.argv) > 9 else 3
os.makedirs(outd, exist_ok=True)
W, H, HH = 1920, 1080, 1088
src = Image.open(ref).convert("RGB"); w, h = src.size; k = sc / 100
rw, rh = round(w * k), round(h * k); x0, y0 = round(cx - rw / 2), round(cy - rh / 2)
canvas = Image.new("RGB", (W, HH), (0, 0, 0)); canvas.paste(src.resize((rw, rh), Image.LANCZOS), (x0, y0))
# 여백은 가장자리 색을 늘려 미리 채움 (인페인트가 검정에 끌려가지 않게)
fill = src.resize((W, HH), Image.BICUBIC).filter(ImageFilter.GaussianBlur(40))
m = Image.new("L", (W, HH), 255); ImageDraw.Draw(m).rectangle([x0 + 10, y0 + 10, x0 + rw - 10, y0 + rh - 10], fill=0)
if erase:
    ex = [round(x0 + erase[0] * k), round(y0 + erase[1] * k), round(x0 + erase[2] * k), round(y0 + erase[3] * k)]
    ImageDraw.Draw(m).rectangle(ex, fill=255)
pre = Image.composite(fill, canvas, m.filter(ImageFilter.GaussianBlur(6)))
pre.crop((0, 0, W, H)).save(os.path.join(outd, "0_배치.png"))
pipe = FluxInpaintPipeline.from_pretrained("ostris/Flex.1-alpha", torch_dtype=torch.bfloat16); pipe.enable_model_cpu_offload()
r1 = pipe(prompt=prompt, image=pre, mask_image=m, width=W, height=HH, strength=1.0, num_inference_steps=32,
          guidance_scale=3.5, generator=torch.Generator("cpu").manual_seed(seed)).images[0]
soft = m.filter(ImageFilter.GaussianBlur(14))
r1 = Image.composite(r1, pre, soft); r1.crop((0, 0, W, H)).save(os.path.join(outd, "1_여백채움.png"))
del pipe; torch.cuda.empty_cache()
p2 = FluxImg2ImgPipeline.from_pretrained("ostris/Flex.1-alpha", torch_dtype=torch.bfloat16); p2.enable_model_cpu_offload()
r2 = p2(prompt=prompt, image=r1, width=W, height=HH, strength=st2, num_inference_steps=36, guidance_scale=3.5,
        generator=torch.Generator("cpu").manual_seed(seed + 1)).images[0]
r2.crop((0, 0, W, H)).save(os.path.join(outd, "2_다시그림.png"))
print("자리", x0, y0, rw, rh, "->", outd)
