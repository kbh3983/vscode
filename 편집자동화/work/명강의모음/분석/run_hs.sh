#!/bin/bash
# 2026-10-31 사용자: "명강의모음이라는 채널의 인터뷰 영상을 분석해 에이전트를 만들거야, 현재 열린 1부-4부의 시퀀스를 인트로, 내용, 구성, 컷편집, 포인트자막, 자료화면 등을 프레임 단위로 상세히 분석해서 인사이트 정리해줘."
# 프로젝트 260903_이효석_인터뷰 시퀀스 이효석_인터뷰_1~4부를 프리미어에서 출력(p1~p4.mov)해 분석
cd "C:/DADA/9.AI/vscode/편집자동화/work"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../scripts
SRC="C:/Users/bbong/AppData/Local/Temp/claude/c--DADA-9-AI-vscode/d0c7dd6d-7684-4662-8d29-8c91d8f2b4a3/scratchpad/hs"
export PYTHONIOENCODING=utf-8
for n in "$@"; do
  v="$SRC/p$n.mov"; d=명강의모음/분석/p$n; mkdir -p $d
  while [ ! -f "$v" ]; do sleep 10; done
  p=0; while true; do s=$(stat -c %s "$v"); [ "$s" = "$p" ] && break; p=$s; sleep 15; done
  echo "$v" > $d/source.txt; echo "== p$n 시작 $(date +%T)"
  ffmpeg -v error -y -i "$v" -vn -ac 2 -ar 44100 $d/audio.wav
  "$PY" $SC/reference/frames.py "$v" $d
  "$PY" $SC/reference/shots.py "$v" $d
  "$PY" $SC/reference/sheet.py "$v" $d/s1/s --fps-all 1 8 6 320
  "$PY" $SC/reference/separate.py $d/audio.wav $d/stems 2>&1 | grep -v -i warn | tail -1
  "$PY" $SC/shortform/transcribe.py $d/stems/vocals.wav $d/t.json 2>&1 | grep -v -i warn | tail -1
  "$PY" $SC/reference/audio.py $d; "$PY" $SC/reference/audio2.py $d
  echo "== p$n 끝 $(date +%T)"
done
echo ALLDONE
