"""머리만 다시 그리기 (SDXL 인페인팅, Mac MPS) — 2026-10-23 필기하는 학생: 고개 숙여 공책 보는 얼굴
  python head_inpaint.py <입력 1024 png> <출력 폴더> <x0,y0,x1,y1 머리 영역> [seed,...]
"""
import sys, os, torch
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from diffusers import StableDiffusionXLInpaintPipeline

SRC, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
X0, Y0, X1, Y1 = [int(v) for v in sys.argv[3].split(",")]
SEEDS = [int(x) for x in (sys.argv[4] if len(sys.argv) > 4 else "1,2,3,4").split(",")]
PROMPT = ("photo, side view of a 13-year-old Korean middle school student boy, head tilted down looking at his notebook on the desk, "
          "focused calm face, eyes looking down, neat short black hair, black t-shirt, plain white background, soft studio lighting")
NEG = "adult, man, beard, looking up, chin up, laughing, deformed face, extra ears, text, watermark, blurry"

pipe = StableDiffusionXLInpaintPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0", torch_dtype=torch.float16, variant="fp16", use_safetensors=True)
pipe.to("mps"); pipe.vae.to(torch.float32); pipe.vae.config.force_upcast = True
init = Image.open(SRC).convert("RGB").resize((1024, 1024))
mask = Image.new("L", (1024, 1024), 0); ImageDraw.Draw(mask).ellipse((X0, Y0, X1, Y1), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(12))
for sd in SEEDS:
    p = f"{OUT}/head_{sd}.png"
    if os.path.exists(p): continue
    im = pipe(PROMPT, negative_prompt=NEG, image=init, mask_image=mask, strength=0.9, num_inference_steps=30, guidance_scale=6.5,
              generator=torch.Generator("cpu").manual_seed(sd)).images[0]
    # 마스크 밖은 원본 그대로
    im = Image.composite(im, init, mask); im.save(p); print("ok", p, flush=True)
print("DONE")
