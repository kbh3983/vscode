#!/bin/zsh
# AE 스크립트를 맥에서 실행 (Windows run_ae.ps1 대신, 2026-10-28)
# 사용: run_ae_mac.sh <jsx> <result.txt> "<끝 표시 정규식>" <최대 초>
# - 창 있는 AE가 없으면 띄우고 AppleScript가 응답할 때까지 기다린 뒤 DoScriptFile로 보냄
# - 한글 경로 문제를 피하려고 jsx를 스크래치(ASCII) 경로로 복사해서 보냄
# - 결과 파일에 끝 표시가 나올 때까지 기다림
JSX="$1"; RES="$2"; DONE="$3"; MAX="${4:-600}"
APP="Adobe After Effects 2026"
TMP="${TMPDIR:-/tmp}/ae_run_$$.jsx"; cp "$JSX" "$TMP"
if ! pgrep -f "After Effects 2026.app/Contents/MacOS" >/dev/null; then open -a "$APP"; fi
for i in {1..90}; do osascript -e "tell application \"$APP\" to DoScript \"1\"" >/dev/null 2>&1 && break; sleep 2; done
[ -f "$RES" ] && mv "$RES" "$RES.prev"
osascript -e "with timeout of $MAX seconds" -e "tell application \"$APP\" to DoScriptFile \"$TMP\"" -e "end timeout" >/dev/null 2>&1 &
for i in $(seq 1 $MAX); do
  if [ -f "$RES" ] && grep -E -q "$DONE" "$RES"; then cat "$RES"; exit 0; fi
  sleep 1
done
echo "시간 초과 ($MAX초) — 마지막 결과:"; [ -f "$RES" ] && cat "$RES"; exit 1
