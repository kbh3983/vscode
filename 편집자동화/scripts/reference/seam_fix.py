"""붙인 그림 경계선 띠만 다시 그리기 (Flex.1-alpha 인페인트) (2026-10-19)
  python seam_fix.py <입력> <출력> <x0,y0,x1,y1 붙인 사각형> "<프롬프트>" [띠 폭=70] [세기=0.9] [씨앗=5]
"""
import sys, torch
from PIL import Image, ImageDraw, ImageFilter
from diffusers import FluxInpaintPipeline
src, out, box, prompt = sys.argv[1:5]; bw = int(sys.argv[5]) if len(sys.argv) > 5 else 70
st = float(sys.argv[6]) if len(sys.argv) > 6 else 0.9; seed = int(sys.argv[7]) if len(sys.argv) > 7 else 5
x0, y0, x1, y1 = [int(v) for v in box.split(",")]
im = Image.open(src).convert("RGB"); W, H = im.size; pad = im.resize((1920, 1088))
m = Image.new("L", (1920, 1088), 0); d = ImageDraw.Draw(m)
d.rectangle([x0 - bw, y0 - bw, x1 + bw, y1 + bw], fill=255); d.rectangle([x0 + bw, y0 + bw, x1 - bw, y1 - bw], fill=0)
p = FluxInpaintPipeline.from_pretrained("ostris/Flex.1-alpha", torch_dtype=torch.bfloat16); p.enable_model_cpu_offload()
r = p(prompt=prompt, image=pad, mask_image=m, width=1920, height=1088, strength=st, num_inference_steps=32, guidance_scale=3.5,
      generator=torch.Generator("cpu").manual_seed(seed)).images[0]
soft = m.filter(ImageFilter.GaussianBlur(bw / 2.5))
Image.composite(r, pad, soft).resize((W, H), Image.LANCZOS).save(out); print("->", out)
