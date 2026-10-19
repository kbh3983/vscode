# 다른 PC에서 같은 작업 하기 — 할 일 목록

2026-10-19 사용자: "내가 다른 피씨로도 지금까지 저장한 내용들로 작업 동일하게 가능한지 궁금해서" → "순서대로 진행해 보자. 1번 먼저 하자. 나머지도 투두로 세부적으로 정리해줘."

이 PC 기준 위치: 저장소 `C:\DADA\9.AI\vscode`, 작업 폴더 `C:\DADA\9.AI\vscode\편집자동화`

## 1. GitHub에 올리기 (기준·학습 기록·스크립트)
- [x] 오늘 작업 커밋 (385f2ca)
- [ ] **저장소 공개 여부 확인** — 지금 `github.com/kbh3983/vscode`가 공개(누구나 볼 수 있음)로 보임. 개인 작업·채널 분석이 들어 있으니 비공개로 바꾼 뒤 올리기를 권장 (GitHub → 저장소 Settings → General → Danger Zone → Change visibility → Private)
- [ ] `git push` (이 PC에서 올라가지 않은 커밋 13개)
- [ ] 다른 PC: `git clone https://github.com/kbh3983/vscode.git` (원하는 위치, 경로를 이 PC와 같게 `C:\DADA\9.AI\vscode`로 하면 스크립트 경로를 고칠 필요가 없음)
- 올라가지 않는 것: 영상·이미지·오디오(.gitignore), work의 분석 폴더(r1~r30 등), input 레퍼런스 원본

## 2. 설치한 자막 템플릿 옮기기 (322개, 약 300MB)
- [ ] 이 PC 폴더 복사: `C:\Users\bbong\AppData\Roaming\Adobe\Common\Motion Graphics Templates`
- [ ] 다른 PC 같은 위치에 붙여넣기 (사용자 이름이 다르면 `C:\Users\<이름>\AppData\Roaming\Adobe\Common\Motion Graphics Templates`)
- [ ] 프리미어 기본 그래픽 패널 → 내 템플릿에 보이는지 확인
- 다시 만들 수도 있음: AE에서 `scripts/jeongbo/ae/make_jeongbo32.jsx` 등 실행 → `scripts/point/ae/finish_mogrt.py`로 설치 (AE·폰트 필요, 시간 걸림)

## 3. 폰트 설치
- [ ] 이 PC 폰트 폴더 복사: `C:\Users\bbong\AppData\Local\Microsoft\Windows\Fonts` (사용자 설치 폰트)
- [ ] 템플릿에 쓴 주요 폰트: Pretendard 전 굵기, 에이투지체(A2Z) 전 굵기, G마켓 산스, Paperlogy, 강원교육현옥샘, 그리운 몽토리, HS산토끼, 검은고딕, 본명조(Noto Serif KR), 망고또박, 배민 폰트들, Noto Sans KR
- [ ] Windows 기본 HY 폰트(HY헤드라인 등)는 대부분 PC에 이미 있음 — 없으면 함께 복사
- [ ] 라이선스 확인 (상업용 무료가 아닌 폰트가 섞여 있지 않은지)

## 4. Claude 메모리 옮기기 (트리거·작업 방식, 124KB)
- [ ] 이 PC 폴더: `C:\Users\bbong\.claude\projects\c--DADA-9-AI-vscode\memory`
- [ ] 다른 PC에서 같은 프로젝트를 한 번 열면 `.claude\projects\<프로젝트 이름>\memory`가 생김 → 거기에 복사 (저장소 경로가 같으면 폴더 이름도 같음)
- [ ] 또는 메모리 폴더를 저장소 안(`편집자동화/docs/memory`)에 복사해 git으로 같이 관리 — 원하면 다음에 설정

## 5. 프로그램 환경
- [ ] Premiere Pro 2026, After Effects 2026 설치
- [ ] Node.js 설치
- [ ] Premiere MCP 브리지: `C:\Users\<이름>\Adobe_Premiere_Pro_MCP` (빌드) + 프리미어에 CEP 패널 설치 → Temp Directory 설정 후 Start Bridge
- [ ] After Effects MCP: `C:\Users\<이름>\after-effects-mcp` (빌드), AE 켤 때마다 파일 > 스크립트 > `build\scripts\mcp-bridge-auto.jsx` 실행
- [ ] 저장소 루트 `.mcp.json`의 경로를 새 PC 사용자 이름에 맞게 고치기
- [ ] Python 3.12 + 작업 폴더에 가상환경 `.venv` 다시 만들기 (torch(CUDA)·diffusers·soundfile·Pillow·numpy 등 — 필요한 패키지 목록은 이 PC에서 `.venv\Scripts\pip freeze`로 뽑아 두기)
- [ ] ffmpeg 설치하고 PATH에 넣기
- [ ] AI 이미지 모델(Flex.1-alpha, 약 31GB)은 처음 실행할 때 자동으로 받음 — 그래픽카드 VRAM 16GB 이상 권장 (이 PC는 RTX 4090 24GB)

## 6. 분석 결과·레퍼런스 원본 (필요할 때만)
- [ ] `편집자동화\work` (77GB): 분석 폴더(r1~), 템플릿 백업, 작업 이미지·영상 — 외장하드나 클라우드 드라이브로 옮김
- [ ] `편집자동화\input` (17GB): 레퍼런스 원본 영상
- 기준값·학습 내용은 이미 agents 문서에 들어 있어서, 새 작업만 한다면 꼭 옮기지 않아도 됨. 예전 분석을 다시 보거나 같은 레퍼런스로 템플릿을 새로 만들 때만 필요

## 7. 다른 PC에서 확인
- [ ] 프리미어 연결 → "현재 열린 시퀀스 몇 개야?"로 브리지 확인
- [ ] AE 연결 → 템플릿 하나 다시 만들어 보기 (`only.txt`에 번호 하나)
- [ ] 자막 템플릿 하나를 시퀀스에 올려 폰트·모양이 이 PC와 같은지 확인
