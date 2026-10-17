#!/bin/bash
# 정보성 레퍼런스 셜록현준 6편(r20~r25) 일괄 분석 (2026-10-17, 사용자: "셜록홈준 레퍼런스 넣어뒀어. 비디오 오디오 구성 프레임 단위로 분석해줘" → 정보성 [셜록현준])
# 원본은 input/ 맨 위에 있음 → source.txt는 input/정보성_레퍼런스 기준 "../파일" (look.sh 그대로 쓰려고)
cd "C:/DADA/9.AI/vscode/편집자동화/input"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../scripts; OUT=../work/정보성/분석
declare -A V
V[r20]="건축가가 한국 전통을 재해석해 만든 도서관.mp4"
V[r21]="건축가들이 한국에서 집 지을 때 가장 신경 쓰는 것.mp4"
V[r22]="도쿄와 서울의 결정적인 차이.mp4"
V[r23]="서울에 공원을 없애는 것 뒤에 감춰진 진실들.mp4"
V[r24]="인천은 공항 말고 뭐가 있을까.mp4"
V[r25]="일론 머스크 감성의 집약체 테슬라 다이너 분석.mp4"
export PYTHONIOENCODING=utf-8
for r in r20 r21 r22 r23 r24 r25; do
  v="${V[$r]}"; d=$OUT/$r; mkdir -p $d
  echo "../$v" > $d/source.txt
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
