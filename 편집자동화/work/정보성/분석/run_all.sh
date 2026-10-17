#!/bin/bash
# 정보성 레퍼런스 5편 일괄 분석 (2026-10-16) — 분리·컷·샷·화면 묶기·1초 시트·받아쓰기·오디오·효과음 묶기
cd "C:/DADA/9.AI/vscode/편집자동화/input/정보성_레퍼런스"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../../scripts; OUT=../../work/정보성/분석
declare -A V
V[r1]="겉으론 티 안나지만 생각보다 많다는 '낮은 자존감' 유형.mp4"
V[r2]="귀에서 자꾸 '삐-' 소리가 난다면 직접 겪은 의사가 알려주는 원인과 치료법.mp4"
V[r3]="다들 이정도는 버티고 사는 거 아닌가요.mp4"
V[r4]="복잡한 건 잘하는데 간단한 건 못하는 고기능 ADHD 특징.mp4"
V[r5]="쉬어도 사라지지 않는 무기력의 진짜 이유.mp4"
export PYTHONIOENCODING=utf-8
for r in r1 r2 r3 r4 r5; do
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
