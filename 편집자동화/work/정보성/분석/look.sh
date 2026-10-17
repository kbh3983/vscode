#!/bin/bash
# 정보성 분석 — 영상 하나 화면 확인용 시트 (효과음 묶음별 · 오프닝 0~120초 1초 · 끝 60초 1초)
# 사용: bash look.sh r1
r=$1; cd "C:/DADA/9.AI/vscode/편집자동화"; S=work/정보성/분석; D=$S/$r; V="input/정보성_레퍼런스/$(cat $D/source.txt)"
PY=.venv/Scripts/python.exe; export PYTHONIOENCODING=utf-8
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V"); e0=$(python -c "print(max(0,int($dur)-62))")
$PY scripts/reference/sheet.py "$V" $D/open/o 0 120 1 10 6 320 >/dev/null &
$PY scripts/reference/sheet.py "$V" $D/open/end $e0 ${dur%.*} 1 10 7 320 >/dev/null &
for g in 0 1 2 3 4 5; do T=$($PY -c "import json;d=json.load(open('$D/sfx_class.json',encoding='utf-8'));g=[x for x in d['groups'] if x['group']==$g];print(','.join(str(round(t+0.15,2)) for t in g[0]['examples']) if g else '')"); [ -n "$T" ] && $PY scripts/reference/sheet.py "$V" $D/sfxg/g$g --times $T 4 2 480 >/dev/null & done
wait; echo done $r
