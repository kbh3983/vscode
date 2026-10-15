"""교양 에이전트 — 자료화면용 이미지 생성 (로컬 Flex.1-alpha, Flux 계열, diffusers)
  python gen_images.py <jobs.json> <out 폴더>
  jobs.json: [{"name": "calypso", "prompt": "...", "seeds": [1,2,3]}]  → <out>/<name>_<seed>.png (1920x1088 → 1920x1080 잘라 저장)
"""
import json, os, sys
import torch
from diffusers import FluxPipeline

jobs = json.load(open(sys.argv[1], encoding="utf-8")); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
pipe = FluxPipeline.from_pretrained("ostris/Flex.1-alpha", torch_dtype=torch.bfloat16)
pipe.enable_model_cpu_offload()
for j in jobs:
    for sd in j.get("seeds", [1]):
        p = os.path.join(out, f"{j['name']}_{sd}.png")
        if os.path.exists(p): continue
        im = pipe(j["prompt"], width=1920, height=1088, num_inference_steps=j.get("steps", 28), guidance_scale=j.get("cfg", 3.5),
                  generator=torch.Generator("cpu").manual_seed(sd)).images[0]
        im.crop((0, 4, 1920, 1084)).save(p)
        print("ok", p, flush=True)
print("DONE")
