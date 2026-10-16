#!/bin/bash
# 브이로그·예능 레퍼런스 추가 2편 일괄 분석 (2026-10-16)
cd "C:/DADA/9.AI/vscode/편집자동화/input/브이로그예능_레퍼런스"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../../scripts; OUT=../../work/브이로그예능/분석
declare -A V
V[r4]="차에서 두달을 먹고 산 다비치....mp4"
V[r5]="프로 출장러, 이번엔 2주 유럽행 ✈️ㅣ밀라노·파리 패션위크 VLOG.mp4"
export PYTHONIOENCODING=utf-8
for r in r4 r5; do
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
"$PY" $SC/reference/sfx_class.py $OUT/r4 6; "$PY" $SC/reference/sfx_class.py $OUT/r5 6; echo SFXDONE
