"""그림 전체를 낮은 세기로 다시 그리기 (Flex.1-alpha img2img) — outpaint_redraw.py 2단계만 따로 (2026-10-19)
  python redraw_img2img.py <입력> <출력> "<프롬프트>" [세기=0.45] [씨앗=4]
"""
import sys, torch
from PIL import Image
from diffusers import FluxImg2ImgPipeline
src, out, prompt = sys.argv[1:4]; st = float(sys.argv[4]) if len(sys.argv) > 4 else 0.45; seed = int(sys.argv[5]) if len(sys.argv) > 5 else 4
im = Image.open(src).convert("RGB"); W, H = im.size
p = FluxImg2ImgPipeline.from_pretrained("ostris/Flex.1-alpha", torch_dtype=torch.bfloat16); p.enable_model_cpu_offload()
r = p(prompt=prompt, image=im.resize((1920, 1088)), width=1920, height=1088, strength=st, num_inference_steps=36, guidance_scale=3.5,
      generator=torch.Generator("cpu").manual_seed(seed)).images[0]
r.resize((W, H), Image.LANCZOS).save(out); print("->", out)
