# 포인트 에이전트 — 봄자막 설정 하나로 AE 템플릿 만들고 "내 템플릿"에 넣기
# 사용: powershell -File scripts/point/ae/build_bom.ps1 <설정 이름(예: 봄06)> <원본 템플릿 이름> <표시 이름>
param([string]$Name, [string]$Orig, [string]$Display)
$root = "C:\DADA\9.AI\vscode\편집자동화"
Set-Content -Path "$root\scripts\point\ae\CFG_PATH.txt" -Value "$root\scripts\point\ae\cfg\$Name.json" -Encoding UTF8 -NoNewline
$out = "$root\work\포인트\ae_templates\$Name"
Get-ChildItem "$out\export\*.mogrt" -ErrorAction SilentlyContinue | Remove-Item -Force
& "$root\scripts\point\ae\run_ae.ps1" -Jsx "$root\scripts\point\ae\make_bom.jsx" -Result "$out\result.txt"
$env:PYTHONIOENCODING = "utf-8"
Push-Location $root
python scripts/point/ae/finish_mogrt.py "work/포인트/ae_templates/$Name/export" "${Orig}_AE" $Display
Pop-Location
