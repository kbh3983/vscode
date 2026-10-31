"""설정 한 값을 바꿔 가며 렌더·비교 (프레임 하나)
사용: python sweep.py <base cfg> <프레임> <값 바꾸는 파이썬 식(c,v)> v1 v2 ..."""
import json, subprocess, sys, os, time
here = os.path.dirname(os.path.abspath(__file__))
base, frame, expr = sys.argv[1], int(sys.argv[2]), sys.argv[3]
for v in sys.argv[4:]:
    c = json.load(open(base, encoding="utf-8")); v = float(v)
    exec(expr)
    c["render_range"] = [frame, 1]
    tmp = os.path.join(os.path.dirname(base), "cfg_sweep.json"); json.dump(c, open(tmp, "w"), ensure_ascii=False)
    t = time.time()
    subprocess.run([sys.executable, os.path.join(here, "run.py"), tmp], capture_output=True)
    r = subprocess.run([sys.executable, "-W", "ignore", os.path.join(here, "compare.py"), c["out"], str(frame)], capture_output=True, text=True).stdout.splitlines()[0]
    print(v, r, "%.0fs" % (time.time() - t), flush=True)
