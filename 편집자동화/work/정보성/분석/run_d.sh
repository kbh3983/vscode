#!/bin/bash
# 정보성 레퍼런스 지식인사이드 지식인초대석 3편 + 크랩 1편(r16~r19) 일괄 분석 (2026-10-16, r1~r5 = 장동선의 궁금한뇌) — 분리·컷·샷·화면 묶기·1초 시트·받아쓰기·오디오·효과음 묶기
cd "C:/DADA/9.AI/vscode/편집자동화/input/정보성_레퍼런스"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../../scripts; OUT=../../work/정보성/분석
declare -A V
V[r16]="적은 돈을 큰 돈으로 불리는 가장 확실한 투자 전략ㅣ지식인초대석 EP.39 (오건영 단장 2부).mp4"
V[r17]="집값, 물가 아무리 비싸도 서울에 살 수밖에 없는 이유ㅣ지식인초대석 EP.42 (유현준 교수 1부).mp4"
V[r18]="지능 높은 아이들이 어릴 때 공통적으로 해본 '1가지'ㅣ지식인초대석 합석 EP.18 (최민준 X 원민우).mp4"
V[r19]="줄줄이 취소되고 있는 네옴시티, 결국 무산될까｜크랩.mp4"
export PYTHONIOENCODING=utf-8
for r in r16 r17 r18 r19; do
  v="${V[$r]}"; d=$OUT/$r; mkdir -p $d
  echo "$v" > $d/source.txt
  echo "== $r 시작 $(date +%T)"
  ffmpeg -v error -y -i "$v" -map 0:a:0 -vn -ac 2 -ar 44100 $d/audio.wav
  "$PY" $SC/reference/separate.py $d/audio.wav $d/stems 2>&1 | grep -v -i warn | tail -1
  "$PY" $SC/reference/frames.py "$v" $d
  "$PY" $SC/reference/shots.py "$v" $d
  "$PY" $SC/reference/classify.py "$v" $d 12 | tail -1
  "$PY" $SC/reference/sheet.py "$v" $d/ov/ov --fps-all 0.1 4 4 480
  "$PY" $SC/shortform/transcribe.py $d/stems/vocals.wav $d/t.json 2>&1 | grep -v -i warn | tail -1
  "$PY" $SC/reference/audio.py $d
  "$PY" $SC/reference/audio2.py $d
  "$PY" $SC/reference/sfx_class.py $d 6 | head -1
  "$PY" $SC/reference/audio3.py $d | tail -c 300
  echo "== $r 끝 $(date +%T)"
done
echo ALLDONE
