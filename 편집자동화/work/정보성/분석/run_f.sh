#!/bin/bash
# 정보성 레퍼런스 크랩 4편(r26~r29) 일괄 분석 (2026-10-17, 사용자: "크랩이라는 채널의 레퍼런스 영상 3개 추가했어. 이것도 정보성 영상 채널이고, 비디오, 구성, 오디오 프레임 단위로 세세히 분석해줘.")
# 폴더에 있던 폴더블폰 편(아직 분석 안 함)도 함께 → 크랩 = r19(네옴시티) + r26~r29, 5편
cd "C:/DADA/9.AI/vscode/편집자동화/input/정보성_레퍼런스"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../../scripts; OUT=../../work/정보성/분석
declare -A V
V[r26]="백 년 동안 일요일에 쉬던 독일이 바뀌는 이유｜크랩.mp4"
V[r27]="아스트라가 쏘아 올린 겁나게 큰 공｜크랩.mp4"
V[r28]="이게 진짜 독립이지  일본에 의지하던 한글 글꼴, 사실은...｜크랩.mp4"
V[r29]="그렇게 비웃더니 결국은 다 폴더블폰을 하는구나｜크랩.mp4"
export PYTHONIOENCODING=utf-8
for r in r26 r27 r28 r29; do
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
