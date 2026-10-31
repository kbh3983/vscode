"""영상 속 모델(성인) 사진을 같은 자세의 아이로 바꾸기 — SDXL img2img, Mac MPS (2026-10-23)
  python child_img2img.py <입력 1024 png> <출력 폴더> [strength,...] [seed,...] [프롬프트 파일]
그림체(만화 필터)는 이 결과에 따로 씌움 — 여기서는 사진 그대로
"""
import sys, os, torch
from PIL import Image
from diffusers import StableDiffusionXLImg2ImgPipeline

SRC, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
STRENGTHS = [float(x) for x in (sys.argv[3] if len(sys.argv) > 3 else "0.55,0.65").split(",")]
SEEDS = [int(x) for x in (sys.argv[4] if len(sys.argv) > 4 else "1,2,3").split(",")]
PROMPT = ("photo, side view of a 10-year-old Korean boy sitting upright on a wooden chair, looking straight ahead, calm face, "
          "short black hair, black t-shirt, black pants, both hands resting on his lap, light green cushion behind his lower back, "
          "plain white background, soft studio lighting, full body")
NEG = "adult, man, beard, wrinkles, laughing, deformed, extra limbs, extra fingers, text, watermark, blurry"
if len(sys.argv) > 5:                      # 프롬프트 파일 (1줄: 프롬프트, 2줄: 네거티브) — 10-23 필기하는 학생
    _l = open(sys.argv[5], encoding="utf-8").read().strip().split("\n")
    PROMPT = _l[0]; NEG = _l[1] if len(_l) > 1 else NEG

pipe = StableDiffusionXLImg2ImgPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0", torch_dtype=torch.float16, variant="fp16", use_safetensors=True)
pipe.to("mps")
pipe.vae.to(torch.float32); pipe.vae.config.force_upcast = True      # MPS fp16 VAE 검은 화면 방지
init = Image.open(SRC).convert("RGB").resize((1024, 1024))
for st in STRENGTHS:
    for sd in SEEDS:
        p = f"{OUT}/child_s{int(st * 100)}_{sd}.png"
        if os.path.exists(p): continue
        im = pipe(PROMPT, negative_prompt=NEG, image=init, strength=st, num_inference_steps=30, guidance_scale=6.0,
                  generator=torch.Generator("cpu").manual_seed(sd)).images[0]
        im.save(p); print("ok", p, flush=True)
print("DONE")
