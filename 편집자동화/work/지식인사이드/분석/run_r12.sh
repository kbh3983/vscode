#!/bin/bash
# 2026-10-19 사용자: "가장 최신 회차 추가해뒀어. 작업 범위 (컷전환, 색보정, 이미지, 자료화면, 자막, 그래픽, 효과음, 배경음악) 프레임 단위로 세세하게 분석"
cd "C:/DADA/9.AI/vscode/편집자동화/work/지식인사이드"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../../scripts
v="$(ls ../../input/정보성_레퍼런스/*EP.30*.mp4 | head -1)"
r=r12; export PYTHONIOENCODING=utf-8; mkdir -p 분석/$r; echo "$v" > 분석/$r/source.txt
echo "== 시작 $(date +%T)"
ffmpeg -v error -y -i "$v" -vn -ac 2 -ar 44100 분석/$r/audio.wav
"$PY" $SC/reference/frames.py "$v" 분석/$r; echo "frames $(date +%T)"
"$PY" $SC/reference/shots.py "$v" 분석/$r; echo "shots $(date +%T)"
"$PY" $SC/reference/sheet.py "$v" 분석/$r/s1/s --fps-all 1 8 6 320; echo "sheet $(date +%T)"
"$PY" $SC/reference/separate.py 분석/$r/audio.wav 분석/$r/stems 2>&1 | grep -v -i warn | tail -1; echo "separate $(date +%T)"
"$PY" $SC/shortform/transcribe.py 분석/$r/stems/vocals.wav 분석/$r/t.json 2>&1 | grep -v -i warn | tail -1; echo "transcribe $(date +%T)"
"$PY" $SC/reference/audio.py 분석/$r; "$PY" $SC/reference/audio2.py 분석/$r; echo "audio $(date +%T)"
echo ALLDONE
