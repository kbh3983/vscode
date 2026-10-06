# 진행 기록

## 2026-10-04
- 프로젝트 생성 (폴더 구조, README)
- 다음: 자동화 목표/범위 정하기 (무음 컷, 자막, 숏폼 추출 등)
- 태스크 리스트 v2 작성: tasks/태스크리스트.md (원본 memo/작업단위, 사용자 초안 검토·보완)
- 다음: 태스크리스트 하단 "확정이 필요한 기준값" 결정 → 태스크별 에이전트 설계
- memo/ 삭제 (사용자). 최종 검수는 사용자가 직접 → QC 에이전트 제외
- 컷편집 에이전트 초안 작성: agents/컷편집/ (AGENT, criteria, learnings, failures, log)
- 다음: 사용자가 컷편집 에이전트 파일 리뷰 → AGENT.md 하단 "미결 사항" 결정
- 미결 사항 3개 결정 반영 (외부 자막 플러그인, 사전 확인 초기 유지, C6~C11 채택·C7 전 테이크 보존)
- 삭제 방식 → 클립 비활성화로 결정
- 남은 미결: 외부 플러그인 단어 단위 타임코드 지원 여부
- 싱크 에이전트 초안 작성: agents/싱크/ (태스크 S1~S9). 프리미어 빈 구조(촬영본/시퀀스/자료) 확정
- 싱크 미결 사항 6개 결정 반영
- 다음: 오프셋 계산 스크립트 작성 (scripts/) → 실제 프로젝트로 싱크 테스트
- Premiere MCP 연결 확인 (브리지 패널 Start Bridge 필요)
- scripts/sync/probe.py, offsets.py 작성 → 테스트 프로젝트(최박사_운동법_테스트)에서 v01_sync 생성 (C0017 +215프레임)
- 다음: 사용자 싱크 확인·카메라 A/B 확정 → layout.py
- 싱크 승인, A캠=C0019 확정, 카메라 라벨(A 창포색 1 / B 보라 0) 기본값 확정, 프로젝트 저장 → 2캠 단일 장면 싱크 완료
- 싱크 두 번째 테스트 (둔근 운동법 4K 2캠): playbook 그대로 실행 → 프레임 캡처 A캠 판단·싱크 모두 승인, v01_sync_2 저장
- git: 편집자동화 안의 중복 저장소 제거, 상위 vscode 저장소로 통합 (강제 푸시는 사용자가 직접 실행 필요)

## 2026-10-05
- 컷편집 C7: 테이크 선택 이유를 받아 take_choices.md에 기록·학습하는 절차 추가
- 컷편집은 자막을 넣지 않음. transcript 없이는 컷 판단 불가 → 자막 에이전트 신설 (agents/자막/: AGENT, criteria, glossary, review, learnings, failures, log)
- 자막 엔진: Premiere Speech to Text 단독으로 확정 (Whisper는 비교 후 제외·삭제). 전사 파일명 transcript.json 고정
- 자막 첫 검토 목록: agents/자막/review/2026-10-05_최박사_운동법_테스트_2.md (꼭 확인 38, 참고 15)
- 다음: 사용자 검토 → glossary 첫 학습 → transcript_reviewed.json → 컷편집 첫 테스트
- 자막 요구사항(agents/자막/AGENT.md에 통합) 파이프라인 구현·실행: asr_pipeline.py(0~3) → candidates.py(5) → corrections.json(4, Claude) → finalize.py(6~7) → Premiere `시퀀스/v01_sync_2_자막` 자막 트랙(8), 저장 완료
- 다음: 사용자 자막 확인·질문 33개 답변 → 학습

- 자막: Whisper → CLOVA 모두 정확도 부족 → **텍스트 생성 포기**, Cutback SRT를 받아 싱크·폭·위치만 담당하도록 재정의. CLOVA 연결 해제
- 다음: 자막 `srt_tools.py` 구현 (S1 검사, S3 싱크, S4 폭 맞추기), Cutback SRT 첫 파일 받기

- 자막: Cutback SRT 처리 srt_tools.py 구현(싱크·맞장구 분리·폭), 문맥 교정 24건 + 용어 사전 학습(glossary.md), v01_sync_cutback / _cutback_2 생성. 화자 구분은 pyannote(HF 토큰 대기)
- 오디오 에이전트 신설 (agents/오디오/): 말소리 -4~-6, 배경음악 -18~-21, 효과음 -10~-12 dB

## 2026-10-06
- 오디오 에이전트 첫 실행: 261006_최박사_운동법_AI / 옆구리살_가편 (A2 트랙만, 사용자 지시)
  - 1차 구간별 키프레임 방식 → 사용자 "비효율" 거절, 학습 안 함
  - 2차 `옆구리살_가편_오디오2`: 게인 +8.15 dB(선택적 제한 입력 증폭) + 최대 진폭 -6 dB → 미터 기준 중앙값 -5.6 dB, 범위 안 341/368
  - scripts/audio/verify.py 추가, levels.py 자막 없는 시퀀스·채널 채우기 지원. 말소리 조절 방법 criteria 변경
  - 리포트: work/최박사_운동법_AI/audio/report.md, 기록: agents/오디오/log/2026-10-06.md
  - 2차 결과 사용자 승인 → agents/오디오/learnings.md 기록
- 다음: B캠(A1) 오디오 처리 결정, 1차 시퀀스 삭제 여부

- 보류: 여러 장면 촬영본 싱크(layout.py, S3 장면 묶기, S8 짝 없는 클립)는 이후 별도 진행 (사용자 결정)
