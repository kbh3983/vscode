# 포인트 에이전트 — 애프터이펙트에 스크립트 보내고 result.txt 기다리기
# 사용: powershell -File scripts/point/ae/run_ae.ps1 <jsx 경로> <result.txt 경로> [끝 표시 정규식] [최대 초]
#   끝 표시를 주면 result.txt에 그 글자(또는 ERR)가 나올 때까지 기다린다 (단계마다 기록하는 스크립트용)
# 한글 경로 스크립트는 AE -r에서 안 열릴 수 있어 ASCII 임시 경로로 복사해서 보낸다
# 주의 (2026-10-12): 프리미어가 AE 템플릿을 그릴 때 dynamiclinkmanager가 창 없는 AE(-m)를 띄운다.
#   이걸 "켜진 AE"로 보면 창 있는 AE 없이 -r을 보내 꼬인다 → 창 있는 AE만 인정, 없으면 띄우고 창이 뜰 때까지 기다림
param([string]$Jsx, [string]$Result, [string]$Done = "", [int]$MaxSec = 300)
$ae = "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\AfterFX.exe"
$tmp = Join-Path $env:TEMP "point_ae_run.jsx"
Copy-Item $Jsx $tmp -Force
if (Test-Path $Result) { Remove-Item $Result -Force }

function Get-UiAE {
    $dl = @(Get-CimInstance Win32_Process -Filter "Name='AfterFX.exe'" | Where-Object { $_.CommandLine -match '(^|\s)-m(\s|$)' } | ForEach-Object { [int]$_.ProcessId })
    Get-Process AfterFX -ErrorAction SilentlyContinue | Where-Object { $dl -notcontains $_.Id -and $_.MainWindowTitle -ne "" }
}
$dlAE = @(Get-CimInstance Win32_Process -Filter "Name='AfterFX.exe'" | Where-Object { $_.CommandLine -match '(^|\s)-m(\s|$)' })
if ($dlAE.Count) { "참고: 프리미어용 창 없는 AE 실행 중 (PID " + (($dlAE | ForEach-Object { $_.ProcessId }) -join ",") + ")" }

if (-not (Get-UiAE)) {
    "창 있는 AE 없음 → 실행"
    Start-Process $ae
    for ($i = 0; $i -lt 180; $i++) { if (Get-UiAE) { break }; Start-Sleep 1 }
    if (-not (Get-UiAE)) { "AE 창이 뜨지 않음"; exit 1 }
    Start-Sleep 15   # 창이 뜬 뒤에도 패널·폰트 불러오기가 끝날 때까지
}
$ui = @(Get-UiAE)
if ($ui.Count -gt 1) { "주의: 창 있는 AE가 " + $ui.Count + "개 — 스크립트가 어느 쪽으로 갈지 모름"; exit 1 }
"보냄 → PID " + $ui[0].Id + " (" + $ui[0].MainWindowTitle + ")"
& $ae -r $tmp

for ($i = 0; $i -lt $MaxSec; $i++) {
    if (Test-Path $Result) {
        if (-not $Done) { break }
        $t = Get-Content $Result -Encoding UTF8 -Raw -ErrorAction SilentlyContinue
        if ($t -match $Done -or $t -match "ERR") { break }
    }
    Start-Sleep 1
}
Start-Sleep 2
if (Test-Path $Result) { Get-Content $Result -Encoding UTF8 } else { "TIMEOUT" }
if ($i -ge $MaxSec) { "TIMEOUT (" + $MaxSec + "초) — 마지막 줄 다음 단계에서 멈춤"; $u = Get-UiAE; if ($u) { "AE 응답: " + $u[0].Responding } }
