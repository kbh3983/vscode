"""명강의모음 AE판 — 설정(JSON)으로 make_point.jsx 실행 → 결과 로그 출력
사용: python scripts/myeong/ae/run.py <cfg.json>"""
import subprocess, sys, os, json
here = os.path.dirname(os.path.abspath(__file__))
cfg = os.path.abspath(sys.argv[1])
out0 = json.load(open(cfg, encoding="utf-8"))["out"]
rp = os.path.join(out0, "result.txt")
if os.path.exists(rp): os.remove(rp)   # 지난 결과가 남아 실패를 성공으로 보지 않게 (2026-10-31)
import glob
for t in glob.glob(os.path.join(out0, "ae", "*.tif")): os.remove(t)
open(os.path.join(here, "cfg_path.txt"), "w").write(cfg)
subprocess.run(["osascript", "-e", f'tell application "Adobe After Effects 2026" to DoScriptFile "{os.path.join(here, json.load(open(cfg, encoding="utf-8")).get("script", "make_point.jsx"))}"'], capture_output=True)
out = json.load(open(cfg, encoding="utf-8"))["out"]
print(open(rp, encoding="utf-8").read().replace("\r", "\n") if os.path.exists(rp) else "결과 없음 — 스크립트가 실행되지 않음(문법 오류 등)")
