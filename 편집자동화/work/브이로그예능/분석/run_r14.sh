#!/bin/bash
# 예능형 레퍼런스 — 장영란 채널 5편 (r14~r18) 일괄 분석 (2026-10-18)
# 사용자: "장영란 채널 예능형 콘텐츠고, 세세히 분석해줘."
cd "C:/DADA/9.AI/vscode/편집자동화/input/예능_레퍼런스"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../../scripts; OUT=../../work/브이로그예능/분석
declare -A V
V[r14]="49세 장영란의 머리숱 풍성해지는 샴푸 비법 (+헤어볼륨 살리는 법).mp4"
V[r15]="내집마련은 옛말 서울 밖으로 밀려나는 요즘 30대 신혼부부 현실 (대출 규제).mp4"
V[r16]="부동산 사기 당했던 장영란이 이를 악물고 알아낸 '좋은 집 구하는 법' 최초공개.mp4"
V[r17]="서울에 이런 집이 월세 30에 15평 투룸 산다는 장영란 PD 초가성비 자취방 대공개(+재물운 인테리어).mp4"
V[r18]="장영란 흙수저 절친 이모란! 서울 4번째 용산 별장 최초공개 (+자수성가, 피눈물 과거).mp4"
export PYTHONIOENCODING=utf-8
for r in r14 r15 r16 r17 r18; do
  v="${V[$r]}"; d=$OUT/$r; mkdir -p $d
  echo "$v" > $d/source.txt
  echo "== $r 시작 $(date +%T)"
  [ -f $d/audio.wav ] || ffmpeg -v error -y -i "$v" -map 0:a:0 -vn -ac 2 -ar 44100 $d/audio.wav
  [ -f $d/stems/vocals.wav ] || "$PY" $SC/reference/separate.py $d/audio.wav $d/stems 2>&1 | grep -v -i warn | tail -1
  [ -f $d/cuts.json ] || "$PY" $SC/reference/frames.py "$v" $d
  [ -f $d/shots.json ] || "$PY" $SC/reference/shots.py "$v" $d
  [ -d $d/s1 ] || "$PY" $SC/reference/sheet.py "$v" $d/s1/s --fps-all 1 8 6 320
  [ -f $d/t.json ] || "$PY" $SC/shortform/transcribe.py $d/stems/vocals.wav $d/t.json 2>&1 | grep -v -i warn | tail -1
  "$PY" $SC/reference/audio.py $d
  "$PY" $SC/reference/audio2.py $d
  "$PY" $SC/reference/sfx_class.py $d 6 > $d/sfx_class.log 2>&1
  echo "== $r 끝 $(date +%T)"
done
echo ALLDONE
