"""교양 에이전트 — 그림 일부만 다시 그리기 (Flex.1-alpha 인페인트) (2026-10-18)
사용자: "칼립소만 서있고 오디세오스 앉은 모습은 지워줘."
  python inpaint_image.py <입력.png> <출력.png> "<x0,y0,x1,y1>" "<채울 내용 프롬프트>" [씨앗=1] [세기=0.95]
- 상자 영역(가장자리 24px 부드럽게)만 다시 그리고 나머지는 원본 그대로 합성
"""
import sys
import torch
from PIL import Image, ImageDraw, ImageFilter
from diffusers import FluxInpaintPipeline

src, out, box, prompt = sys.argv[1:5]
seed = int(sys.argv[5]) if len(sys.argv) > 5 else 1
strength = float(sys.argv[6]) if len(sys.argv) > 6 else 0.95
x0, y0, x1, y1 = [int(v) for v in box.split(",")]
im = Image.open(src).convert("RGB"); W, H = im.size
pad = im.resize((1920, 1088))   # 16의 배수
mask = Image.new("L", (1920, 1088), 0); ImageDraw.Draw(mask).rectangle([x0, y0 * 1088 // H, x1, y1 * 1088 // H], fill=255)
pipe = FluxInpaintPipeline.from_pretrained("ostris/Flex.1-alpha", torch_dtype=torch.bfloat16)
pipe.enable_model_cpu_offload()
res = pipe(prompt=prompt, image=pad, mask_image=mask, width=1920, height=1088, strength=strength, num_inference_steps=30,
           guidance_scale=3.5, generator=torch.Generator("cpu").manual_seed(seed)).images[0].resize((W, H))
soft = Image.new("L", (W, H), 0); ImageDraw.Draw(soft).rectangle([x0, y0, x1, y1], fill=255); soft = soft.filter(ImageFilter.GaussianBlur(12))
Image.composite(res, im, soft).save(out)
print("->", out)
