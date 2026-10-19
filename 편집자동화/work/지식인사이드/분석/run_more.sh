#!/bin/bash
cd "C:/DADA/9.AI/vscode/편집자동화/work/지식인사이드"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../../scripts
declare -A V
V[r6]="빚부터 갚지 마세요  평생 돈 못 모으는 잘못된 습관 '한가지'ㅣ지식인 클래스 EP.24 (김현우 소장) (1).mp4"
V[r7]="정신과 원장이 말하는 영화 '인턴' 최민식 연기가 충격적인 이유 ㅣ지식인 클래스 EP.25 (오진승 원장).mp4"
V[r8]="한국인들이 유독 남의 시선을 의식하는 이유ㅣ지식인 클래스 EP.26 (정지아 작가).mp4"
V[r9]="전 세계가 작정하고 한 사람을 속이면 벌어지는 일 (트루먼 쇼)ㅣ지식인 클래스 EP.27 (오진승 원장).mp4"
V[r10]="2026년 꼭 담아야 할 최고의 배당ETF 조합 ㅣ지식인 클래스 EP.29 (박곰희 작가).mp4"
export PYTHONIOENCODING=utf-8
for r in r6 r7 r8 r9 r10; do
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
  "$PY" $SC/reference/audio2.py 분석/$r
  echo "== $r 끝 $(date +%T)"
done
echo ALLDONE
