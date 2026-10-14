"""회고 — MCP 없이 프리미어 브리지 폴더로 ExtendScript 보내기 (2026-10-13)
사용: python -I -X utf8 scripts/review/pr.py <jsx 파일 또는 "-"(표준 입력)> [최대 초]
- 브리지 폴더 = ~/.premiere-mcp-bridge/config.json 의 tempDirectory (프리미어 패널이 쓰는 경로)
- 스크립트는 함수 몸통처럼 쓴다 (return 값이 결과). 결과 JSON을 그대로 출력
"""
import json, os, sys, time, uuid

def bridge():
    return json.load(open(os.path.expanduser("~/.premiere-mcp-bridge/config.json"), encoding="utf-8"))["tempDirectory"]

def run(body, timeout=60):
    d, i = bridge(), "rv-" + uuid.uuid4().hex
    tmp, cmd, res = (os.path.join(d, n) for n in (".tmp-%s.json" % i, "command-%s.json" % i, "response-%s.json" % i))
    json.dump({"id": i, "script": "(function(){\n" + body + "\n})();", "timeoutMs": timeout * 1000,
               "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}, open(tmp, "w", encoding="utf-8"))
    os.replace(tmp, cmd)
    try:
        for _ in range(timeout * 10):
            if os.path.exists(res):
                time.sleep(0.1)
                return json.load(open(res, encoding="utf-8"))
            time.sleep(0.1)
        raise TimeoutError("응답 없음 %d초 — 프리미어 MCP Bridge 패널 확인 (%s)" % (timeout, d))
    finally:
        for p in (cmd, res):
            try: os.remove(p)
            except OSError: pass

if __name__ == "__main__":
    src = sys.stdin.read() if sys.argv[1] == "-" else open(sys.argv[1], encoding="utf-8").read()
    r = run(src, int(sys.argv[2]) if len(sys.argv) > 2 else 60)
    print(json.dumps(r, ensure_ascii=False))
