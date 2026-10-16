#!/bin/bash
# 브이로그·예능 레퍼런스 3편 일괄 분석 (2026-10-16)
cd "C:/DADA/9.AI/vscode/편집자동화/input/브이로그예능_레퍼런스"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../../scripts; OUT=../../work/브이로그예능/분석
declare -A V
V[r1]="[VLOG] 심심하면 아들들을 키우세요💥  부산연휴 EP.02.mp4"
V[r2]="우리가 진짜 부부가 될 수 있을까.mp4"
V[r3]="피곤해도 밥은 차려 먹는 용산구 자취왕 (w 고현정, 던, 원소윤).mp4"
export PYTHONIOENCODING=utf-8
for r in r1 r2 r3; do
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
# 효과음 묶기 (run_all 끝난 뒤 따로)
