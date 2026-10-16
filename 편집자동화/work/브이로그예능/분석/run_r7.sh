#!/bin/bash
# 브이로그·예능 레퍼런스 예능형 3편(r7~r9) 일괄 분석 (2026-10-16)
cd "C:/DADA/9.AI/vscode/편집자동화/input/브이로그예능_레퍼런스"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../../scripts; OUT=../../work/브이로그예능/분석
declare -A V
V[r7]="[VLOG] 둘째는 강하게 키우는 거 맞죠.mp4"
V[r8]="[VLOG] 부산 이모들 총출동🚨 정신없는 대가족 공동육아🤣.mp4"
V[r9]="[VLOG] 친정 식구들과 귀요미 조카😆 임산부까지 함께한 복작복작 대가족 명절.mp4"
export PYTHONIOENCODING=utf-8
for r in r7 r8 r9; do
  v="${V[$r]}"; d=$OUT/$r; mkdir -p $d
  echo "$v" > $d/source.txt
  echo "== $r 시작 $(date +%T)"
  ffmpeg -v error -y -i "$v" -map 0:a:0 -vn -ac 2 -ar 44100 $d/audio.wav
  "$PY" $SC/reference/separate.py $d/audio.wav $d/stems 2>&1 | grep -v -i warn | tail -1
  "$PY" $SC/reference/frames.py "$v" $d
  "$PY" $SC/reference/shots.py "$v" $d
  "$PY" $SC/reference/sheet.py "$v" $d/s1/s --fps-all 1 8 6 320
  "$PY" $SC/shortform/transcribe.py $d/stems/vocals.wav $d/t.json 2>&1 | grep -v -i warn | tail -1
  "$PY" $SC/reference/audio.py $d
  "$PY" $SC/reference/audio2.py $d
  echo "== $r 끝 $(date +%T)"
done
echo ALLDONE
for r in r7 r8 r9; do "$PY" $SC/reference/sfx_class.py $OUT/$r 6; done; echo SFXDONE
