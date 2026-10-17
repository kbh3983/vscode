#!/bin/bash
# 정보성 레퍼런스 세바시 인생질문 5편(r11~r15) 일괄 분석 (2026-10-16, r1~r5 = 장동선의 궁금한뇌) — 분리·컷·샷·화면 묶기·1초 시트·받아쓰기·오디오·효과음 묶기
cd "C:/DADA/9.AI/vscode/편집자동화/input/정보성_레퍼런스"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../../scripts; OUT=../../work/정보성/분석
declare -A V
V[r11]="30년 치매 연구자가 꼽은 뇌를 지키는 최고의 취미 생활   묵인희 서울대 의대 교수   치매 건강 노화 뇌   인생질문 358회.mp4"
V[r12]="듣고나면 인생이 편해지는 연세대 최고 인생 강의   김은주 연세대 교수   직장인 커리어 성장 행복   인생질문 348회.mp4"
V[r13]="우울증은 아닌데 의욕은 제로, 의사들도 주목하기 시작한 '이 상태’는   윤홍균 정신과 전문의   직장인 우울 상담 심리   인생질문 345회.mp4"
V[r14]="인생의 중요한 갈림길에서 후회 없는 선택을 내리는 심리학적 방법   이동귀 연세대학교 교수   직장인 이직 주식 고민   인생질문 346회.mp4"
V[r15]="일을 돕던 AI가 일을 없애기 시작했다, 이제 무엇을 준비해야 할까   송길영 작가   시대예보 AI 미래   인생질문 362회.mp4"
export PYTHONIOENCODING=utf-8
for r in r11 r12 r13 r14 r15; do
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
