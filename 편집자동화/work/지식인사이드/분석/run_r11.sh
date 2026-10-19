#!/bin/bash
# 2026-10-19 사용자: "자막 시퀀스에 추가해둔 영상의 비디오와 오디오를 프레임 단위로 분석해줘 … 타이포 그래픽, 모션 그래픽, 효과음을 모두"
cd "C:/DADA/9.AI/vscode/편집자동화/work/지식인사이드"
PY="C:/DADA/9.AI/vscode/편집자동화/.venv/Scripts/python.exe"; SC=../../scripts
v="C:/Users/bbong/Videos/4K Video Downloader+/심리학자가 말하는‘불안한 아이’가 오히려 잘 크고 있는 이유ㅣ지식인 클래스 EP.21 (김경일 교수).mp4"
r=r11; export PYTHONIOENCODING=utf-8; mkdir -p 분석/$r; echo "$v" > 분석/$r/source.txt
echo "== 시작 $(date +%T)"
ffmpeg -v error -y -i "$v" -vn -ac 2 -ar 44100 분석/$r/audio.wav
"$PY" $SC/reference/frames.py "$v" 분석/$r; echo "frames $(date +%T)"
"$PY" $SC/reference/shots.py "$v" 분석/$r; echo "shots $(date +%T)"
"$PY" $SC/reference/sheet.py "$v" 분석/$r/s1/s --fps-all 1 8 6 320; echo "sheet $(date +%T)"
"$PY" $SC/reference/separate.py 분석/$r/audio.wav 분석/$r/stems 2>&1 | grep -v -i warn | tail -1; echo "separate $(date +%T)"
"$PY" $SC/shortform/transcribe.py 분석/$r/stems/vocals.wav 분석/$r/t.json 2>&1 | grep -v -i warn | tail -1; echo "transcribe $(date +%T)"
"$PY" $SC/reference/audio.py 분석/$r; "$PY" $SC/reference/audio2.py 분석/$r; echo "audio $(date +%T)"
echo ALLDONE
