---
name: generate-all
description: 목차 생성부터 섹션 작성, 최종 패키지, 발표본까지 제안서 전체 생성 프로세스를 순차 실행합니다
---

# 제안서 전체 생성 (전체 워크플로우)

RFP와 기업 시드 문서를 기반으로 제안서 전체 생성 과정을 순차적으로 수행하라.

$ARGUMENTS 형식: `<RFP경로> [시드경로]`

## 인자 파싱 및 문서 확보

다음 순서로 문서를 확보한다:

1. **$ARGUMENTS에서 확인**: 첫 번째 인자를 RFP 경로, 두 번째 인자를 시드 경로로 사용한다
2. **자동 탐색**: 인자가 없으면 다음을 순차 탐색한다
   - `data/output/` 디렉토리에서 Glob Tool로 기존 `목차.md` 검색 (이미 생성된 경우 Phase 1 건너뛰기)
   - `data/business/` 디렉토리에서 Glob Tool로 RFP/제안요청서 파일 검색
   - `data/seed/` 디렉토리에서 Glob Tool로 기업 시드 문서 검색
   - 파일이 여러 개 발견되면 목록을 보여주고 사용자에게 선택을 요청한다
3. **사용자에게 요청**: 문서를 찾지 못하면 대화형으로 요청한다:
   "제안서 생성에 필요한 문서를 입력해주세요:
   - RFP/제안요청서 파일 경로 (필수)
   - 기업 시드 문서 경로 (필수)"
   - 사용자가 경로를 입력하면 해당 파일로 계속 진행한다

## 실행 계획 확인

생성 파이프라인을 보여주고 실행 범위를 확인한다:

```
## 제안서 생성 파이프라인

| # | 단계 | 커맨드 | 설명 |
|---|------|--------|------|
| 1 | 목차 생성 | generate-toc | RFP+시드 분석 → 맞춤형 목차 |
| 2 | 공통 리소스 | generate-common | CSS/JS/설정 파일 생성 |
| 3 | 섹션 작성 | generate-section | 각 섹션 HTML 페이지 작성 |
| 4 | 최종 패키지 | generate-proposal | 표지/목차/네비게이션 + HTML 패키지 |
| 5 | 발표본 생성 | generate-presentation | 16:9 프레젠테이션 슬라이드 |
| 6 | PPTX 변환 | generate-pptx | PPTX 파일 생성 (선택) |

전체 생성을 실행하시겠습니까?
(Y: 전체 / 번호 지정: 선택 실행 / N: 취소)
```

사용자가 번호를 지정하면 해당 단계만 실행한다 (예: `3 4` → generate-section + generate-proposal만 실행).
단, 이전 단계의 출력물이 필요한 경우 존재 여부를 확인하고, 없으면 해당 단계부터 실행한다.

## Phase 1: 목차 생성 (`generate-toc`)

### Step 1: RFP 및 시드 분석

RFP와 시드 문서를 toc-generator 에이전트에 위임한다:
- 평가기준 ↔ 기업 강점 매핑
- 섹션별 배점 기반 깊이 배분
- 도표/도안 계획 수립

### Step 2: 목차 확인

생성된 목차를 보여주고 사용자 확인을 받는다:
- 섹션 구조, 페이지 예산, 핵심메시지
- 수정 요청이 있으면 반영 후 재생성

목차 저장: `data/output/{사업명_경로}/목차.md`

## Phase 2: 공통 리소스 생성 (`generate-common`)

### Step 3: CSS/JS/설정 생성

목차 파일을 읽어 공통 리소스를 생성한다:
- `_common/page-frame.css` — 공유 스타일
- `_common/page-frame.js` — 헤더/푸터/페이지번호/자동분할
- `_common/common-config.json` — 장별 시작 페이지 설정

## Phase 3: 섹션 작성 (`generate-section`)

### Step 4: 작성 범위 확인

섹션 목록을 보여주고 작성 범위를 확인한다.

### Step 5: 섹션별 순차 작성

각 섹션에 대해 section-writer 에이전트로 HTML 페이지를 생성한다:
- 관련 RFP 요구사항 조회
- 인라인 도표/도안 포함
- 완성 즉시 파일 저장 및 진행 보고

## Phase 4: 최종 패키지 (`generate-proposal`)

### Step 6: 검증 및 패키지 생성

작성된 섹션을 검증하고 최종 HTML 패키지를 생성한다:
- 섹션 누락/잔여 확인
- 표지/장간지 이미지 생성
- proposal-finalizer 에이전트 → index.html + chapters/*.html
- 섹션 HTML 변환 복사 (경로 재작성 + 네비게이션 삽입)

패키지 저장: `data/output/{사업명_경로}/final/`

## Phase 5: 발표본 생성 (`generate-presentation`)

### Step 7: 프레젠테이션 생성

작성된 섹션 HTML을 16:9 가로형 슬라이드로 변환한다:
- presentation-writer 에이전트로 콘텐츠 압축 및 슬라이드화
- CSS 애니메이션 적용

프레젠테이션 저장: `data/output/{사업명_경로}/presentation/`

## Phase 6: PPTX 변환 (`generate-pptx`) — 선택

### Step 8: PPTX 변환 확인

사용자에게 PPTX 변환 여부를 확인한다:
"프레젠테이션을 PPTX 파일로도 변환하시겠습니까? (Y/N)
(Node.js, puppeteer, dom-to-pptx가 필요합니다)"

- **Yes** → dom-to-pptx + Puppeteer로 네이티브 PPTX 요소 변환
- **No** → 건너뛰기

## 최종 요약

모든 단계 완료 후 종합 보고한다:

```
## 제안서 생성 완료

### 생성 결과
- 목차: {N}개 섹션, {P}페이지
- 섹션 HTML: {N}개 파일 (도표 {T}개 + 도안 {D}개)
- 최종 패키지: final/index.html (자기완결형)
- 발표본: presentation/index.html ({S}슬라이드)

### 파일 구조

    data/output/{사업명_경로}/
    ├── 목차.md
    ├── sections/              ← 개별 섹션 HTML
    ├── _common/               ← 공유 CSS/JS/설정
    ├── final/                 ← 최종 HTML 패키지 (ZIP 배포용)
    │   └── index.html         ← 진입점
    └── presentation/          ← 발표본
        └── index.html         ← 진입점

### 다음 단계
1. `final/index.html`을 Chrome에서 열어 전체 검토
2. `{확인 필요}` 항목을 실제 데이터로 교체
3. 검토 완료 후 `final/` 폴더를 ZIP으로 압축하여 제출
```
