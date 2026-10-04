# 싱크 실행 절차서 (Playbook)

**2026-10-04 최박사_운동법_테스트에서 사용자가 승인한 작업을 그대로 재현하기 위한 절차.**
("너무 싱크가 잘 맞았어. 다음에도 오늘과 같이 결과물이 나오도록")
이 순서와 값을 기본으로 따른다. 바꾸려면 사용자 승인을 받고 이 파일과 `criteria.md`를 함께 고친다.

적용 범위: **카메라 2대 · 장면 1개**. 여러 장면은 아직 검증 전 (AGENT.md 미결 사항).

---

## 0. 준비
1. `criteria.md` → `learnings.md` → `failures.md` → 최근 `log/` 읽기
2. Premiere 연결 확인: `verify_premiere_connection`
   - 실패하면: Premiere에서 MCP Bridge 패널 열기 → Temp Directory 확인 → **Start Bridge** 클릭을 사용자에게 요청
3. 프로젝트 구조 확인: `list_project_items(includeBins=true)`
   - `촬영본` 빈과 클립 ID·파일 경로(mediaPath)를 기록
4. 작업 폴더: `편집자동화/work/<프로젝트명>/`

## 1. 클립 정보 (S1)
```powershell
python 편집자동화/scripts/sync/probe.py work/<프로젝트명>/probe.json <클립1 경로> <클립2 경로>
```
- 해상도·FPS·오디오 확인 → 시퀀스 프리셋 선택에 사용
- `creation_time`은 복사 시각일 수 있으니 촬영 순서 판단에 믿지 않는다

## 2. 카메라 구분 (S2)
- 각 클립의 프레임을 캡처해서 **정면 구도와 넓은 샷이면 A캠**, 나머지는 B캠
  ```powershell
  ffmpeg -v error -y -ss 120 -i <클립 경로> -frames:v 1 -vf scale=640:-1 work/<프로젝트명>/frame_<클립명>.jpg
  ```
  캡처 이미지를 직접 보고 판단한다
- 원본 폴더 이름(cam 1 / cam 2 등)은 A/B와 다를 수 있으니 쓰지 않는다 (2026-10-04 둔근 운동법: cam 2가 A캠)
- 초기 운영 기간: 캡처 화면 + 판단 이유를 보여 주고 사용자 확인을 받는다 (`criteria.md` 운영 방식)

## 3. 오프셋 계산 (S4, S6, S7)
```powershell
python 편집자동화/scripts/sync/offsets.py work/<프로젝트명>/probe.json work/<프로젝트명>/offsets.json
```
결과에서 확인할 것:
| 항목 | 통과 기준 | 2026-10-04 실제 값 |
|---|---|---|
| `confidence` | 0.8 이상 | 0.90 |
| `spread_frames_iqr` | 1프레임 이하 | 0.65 |
| `drift_frames_start_to_end` | ±1프레임 이내 | -0.62 |
| `status` | ok | ok |

- `b_start_in_a_frames`: A(목록 첫 클립) 기준 B가 놓일 프레임. 음수면 B가 먼저 시작
- **A캠 기준으로 다시 계산:** 기준(A캠)을 0에 놓고 B캠 시작 위치 = A캠 대비 프레임 수
  - 예) 2026-10-04: a=C0017(B캠), b=C0019(A캠), 결과 -215 → A캠(C0019) 0, B캠(C0017) +215프레임
- 시간(초) = 프레임 × 1001 / 30000 (29.97fps). 예) 215프레임 = 7.173833초
- 통과 못 하면 배치하지 말고 사용자에게 보고

## 4. 사전 확인 (초기 운영 기간)
- 카메라 구분, 오프셋, 품질 수치를 요약해 보여 주고 승인받는다

## 5. 라벨 지정 (S10) — **반드시 배치 전에**
- `set_color_label(projectItemId=<A캠 클립>, colorIndex=1)` → 창포색
- `set_color_label(projectItemId=<B캠 클립>, colorIndex=0)` → 보라
- 번호는 `agents/README.md` 한글 라벨 번호표로 고른다 (영어 이름 짐작 금지. 8은 자주색)

## 6. 시퀀스 생성·배치 (S5)
1. `create_bin(name="시퀀스")` (없을 때만)
2. `create_sequence(name="v01_sync", presetPath=<클립과 같은 설정의 프리셋>)`
   - 1280x720 29.97fps → `C:\Program Files\Adobe\Adobe Premiere Pro 2026\Settings\SequencePresets\Legacy\AVCHD\720p\AVCHD 720p30.sqpreset`
   - 3840x2160 29.97fps → `C:\Program Files\Adobe\Adobe Premiere Pro 2026\Settings\SequencePresets\UHD (4K)\UHD (4K) 2160p 29.97 fps.sqpreset`
   - 같은 이름의 시퀀스가 이미 있으면 `_2`, `_3`을 붙인다 (2026-10-04 사용자 승인: `v01_sync_2`)
   - 다른 해상도·FPS면 맞는 프리셋을 찾고 사용자에게 알린다
   - `create_sequence_from_clips`는 클립 ID를 인식하지 못해 쓰지 않는다
3. `get_sequence_settings`로 해상도·FPS가 클립과 같은지 확인
4. 배치 (`insertMode="overwrite"`):
   - A캠: `add_to_timeline(trackIndex=0, time=0)` → V1/A1
   - B캠: `add_to_timeline(trackIndex=1, time=<3단계 초>)` → V2/A2
5. `list_sequence_tracks`로 위치·길이 확인
6. 시퀀스를 `시퀀스` 빈으로 이동: `list_project_items`로 시퀀스 ID 확인 → `move_item_to_bin`
- 오디오 트랙은 모두 켜 둔다. 멀티카메라 소스 시퀀스로 바꾸지 않는다

## 7. 확인 요청 → 저장
- 사용자에게 확인 요청:
  - A1·A2를 함께 들었을 때 울림이 없는지 (싱크)
  - V2/A2가 보라인지 (라벨)
- 승인 후 `save_project`

## 8. 기록
- `work/<프로젝트명>/sync_map.json`
- `log/YYYY-MM-DD.md` (템플릿 `log/_template.md`)
- 승인 → `learnings.md`, 거절 → `failures.md`
- 연속 승인 횟수 → `criteria.md` 갱신

---

## 이미 겪은 실수 (반복 금지)
| 실수 | 올바른 방법 |
|---|---|
| 단순 파형 비교 → 신뢰도 0.39 | GCC-PHAT (offsets.py 기본값) |
| 20초 구간 하나로 계산 → ±1프레임 흔들림 | 전체 구간 중앙값 (offsets.py 기본값) |
| 라벨 8번을 '보라'로 짐작 → 자주색 | 보라 = 0, 번호표 확인 |
| 배치 후 빈 라벨만 변경 → 시퀀스 클립에 반영 안 됨 | 라벨 먼저, 배치 나중. 이미 배치했으면 빼고(lift) 같은 위치에 다시 올림 |
