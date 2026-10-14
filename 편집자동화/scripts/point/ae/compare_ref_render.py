"""참고 영상 vs AE 렌더를 같은 프레임 번호끼리 나란히 붙인 비교 시트를 만든다.
사용: python compare_ref_render.py <ID> <참고영상 시작초> <AE mp4> <출력폴더> <프레임번호...>
  참고 영상(REF) 1748x970 기준, AE 1920x1080 렌더를 같은 배율로 줄여 같은 영역을 자른다 (다른 참고 영상이면 REF·crop 값 바꾸기)
"""
import subprocess, sys, os

ID, start, ae, out = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4]
frames = [int(x) for x in sys.argv[5:]]
REF = r"C:\Users\bbong\Desktop\메아리 자막.mp4"
FONT = "fontfile='C\\:/Windows/Fonts/arial.ttf'"
os.makedirs(out, exist_ok=True)

def run(args):
    subprocess.run(["ffmpeg", "-v", "error", "-y"] + args, check=True)

pairs = []
for n in frames:
    r = os.path.join(out, f"{ID}_r{n:03d}.png")
    a = os.path.join(out, f"{ID}_a{n:03d}.png")
    p = os.path.join(out, f"{ID}_p{n:03d}.png")
    # 참고: 1748x970, 글자 중심 부근 1400x300
    run(["-ss", f"{start + n / 30 + 0.005:.3f}", "-i", REF, "-frames:v", "1",
         "-vf", f"crop=1400:300:174:335,scale=700:150,drawtext={FONT}:text='REF f{n}':x=4:y=4:fontsize=14:fontcolor=yellow:box=1:boxcolor=black", r])
    # AE: 1920x1080 → 참고와 같은 배율(1748/1920)로 줄여서 같은 영역
    run(["-i", ae, "-vf", f"select=eq(n\\,{n}),scale=1748:983,crop=1400:300:174:341,scale=700:150,drawtext={FONT}:text='AE f{n}':x=4:y=4:fontsize=14:fontcolor=cyan:box=1:boxcolor=black",
         "-frames:v", "1", "-fps_mode", "passthrough", a])
    run(["-i", r, "-i", a, "-filter_complex", "hstack", p])
    pairs.append(p)

# 8쌍씩 세로로 묶기
for k in range(0, len(pairs), 8):
    chunk = pairs[k:k + 8]
    args = []
    for c in chunk:
        args += ["-i", c]
    run(args + ["-filter_complex", f"vstack=inputs={len(chunk)}" if len(chunk) > 1 else "null",
                os.path.join(out, f"{ID}_sheet{k // 8 + 1}.png")])
print("ok", len(pairs))
