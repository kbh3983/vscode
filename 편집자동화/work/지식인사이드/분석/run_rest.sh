#!/bin/bash
cd "C:/DADA/9.AI/vscode/편집자동화/work/지식인사이드"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../../scripts
declare -A V
V[r3]="멀쩡한 회사 잘 다니다 갑자기 사표내는 요즘 2030ㅣ지식인 클래스 EP.22 (김경일 교수).mp4"
V[r4]="실제 후기 “안 읽으면 완전 손해”, “페이지를 넘길 때마다 주옥같은 내용들”, “해법을 찾은 것 같아요”.mp4"
V[r5]="한번 커지면 절대 못 줄이는 30대 최악의 씀씀이ㅣ지식인 클래스 EP.23 (김현우 소장).mp4"
export PYTHONIOENCODING=utf-8
for r in r3 r4 r5; do
  v="${V[$r]}"; mkdir -p 분석/$r
  echo "== $r 시작 $(date +%T)"
  ffmpeg -v error -y -i "$v" -vn -ac 2 -ar 44100 분석/$r/audio.wav
  "$PY" $SC/reference/separate.py 분석/$r/audio.wav 분석/$r/stems 2>&1 | grep -v -i warn | tail -1
  "$PY" $SC/reference/frames.py "$v" 분석/$r
  "$PY" $SC/reference/shots.py "$v" 분석/$r
  "$PY" $SC/reference/classify.py "$v" 분석/$r 12 | tail -1
  "$PY" $SC/reference/sheet.py "$v" 분석/$r/s1/s --fps-all 1 8 6 320
  "$PY" $SC/shortform/transcribe.py 분석/$r/stems/vocals.wav 분석/$r/t.json 2>&1 | grep -v -i warn | tail -1
  "$PY" $SC/reference/audio.py 분석/$r
  echo "== $r 끝 $(date +%T)"
done
echo ALLDONE
