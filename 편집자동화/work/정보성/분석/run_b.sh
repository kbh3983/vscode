#!/bin/bash
# 정보성 레퍼런스 조승연의 탐구생활 5편(r6~r10) 일괄 분석 (2026-10-16, r1~r5 = 장동선의 궁금한뇌) — 분리·컷·샷·화면 묶기·1초 시트·받아쓰기·오디오·효과음 묶기
cd "C:/DADA/9.AI/vscode/편집자동화/input/정보성_레퍼런스"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../../scripts; OUT=../../work/정보성/분석
declare -A V
V[r6]="AI시대에 어떤 사람이 대체되지 않을까.mp4"
V[r7]="명성 집 가족 인생은 랄프 로렌처럼 살고 싶은 이유.mp4"
V[r8]="명품백 대신 호텔 에코백 요즘 부자들이 돈 쓰는 곳은   MMM @미키피디아.mp4"
V[r9]="좌식에서 식탁으로 가족 간의 대화가 중요해진 이유.mp4"
V[r10]="🔥 8282의 민족 한국인들은 왜 빠른 속도를 좋아할까.mp4"
export PYTHONIOENCODING=utf-8
for r in r6 r7 r8 r9 r10; do
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
  echo "== $r 끝 $(date +%T)"
done
echo ALLDONE
