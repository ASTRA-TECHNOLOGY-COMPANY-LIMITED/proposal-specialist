---
name: generate-common
description: 제안서 공통 리소스(CSS, JS, 설정)를 생성하여 섹션 HTML의 헤더/푸터/페이지 번호를 통합 관리합니다
---

# 공통 리소스 생성

$ARGUMENTS 에 지정된 목차 파일을 기반으로 섹션 HTML에서 사용할 공통 CSS, JS, 설정 파일을 생성하라.

## 인자 파싱

$ARGUMENTS 형식: `<목차파일경로>`

- 목차파일경로가 있으면 해당 파일을 사용한다
- 인자가 없으면 `data/output/` 디렉토리에서 Glob Tool로 `목차.md` 파일을 찾는다
- 목차 파일이 여러 개 발견되면 목록을 보여주고 사용자에게 선택을 요청한다

## 실행 절차

### Step 1: 목차 파일 읽기

Read Tool로 목차 파일을 읽고 YAML 프론트매터에서 추출한다:

- `사업명` — 프로젝트 표시명
- `사업명_경로` — 파일시스템 안전 경로명
- `발주처` — 발주 기관명

목차 본문에서 추출한다:
- 장(章) 구조 — 로마 숫자 장 번호(I, II, III...)와 장 제목
- 각 장의 첫 번째 섹션 번호
- 각 장에 속한 섹션들의 페이지예산 합계
- 전체 페이지 수 (모든 섹션의 페이지예산 합)

### Step 2: 장별 시작 페이지 계산

장별 `startPage`를 순차적으로 계산한다:

```
장 I의 startPage = 1
장 II의 startPage = 1 + (장 I에 속한 모든 섹션의 페이지예산 합)
장 III의 startPage = 장 II의 startPage + (장 II에 속한 모든 섹션의 페이지예산 합)
...
```

### Step 3: 공통 파일 복사

플러그인 루트의 디자인 시스템 파일을 출력 디렉토리에 복사한다.

1. Read Tool로 플러그인 루트의 원본 파일을 읽는다:
   - `${CLAUDE_PLUGIN_ROOT}/skills/html-design-system/page-frame.css`
   - `${CLAUDE_PLUGIN_ROOT}/skills/html-design-system/page-frame.js`

2. Write Tool로 출력 디렉토리에 저장한다:
   - `data/output/{사업명_경로}/_common/page-frame.css`
   - `data/output/{사업명_경로}/_common/page-frame.js`

### Step 4: common-config.json 생성

Write Tool로 설정 파일을 생성한다:

경로: `data/output/{사업명_경로}/_common/common-config.json`

```json
{
  "사업명": "○○ 시스템 구축",
  "발주처": "KOTRA",
  "장_설정": {
    "I": { "title": "일반현황", "startPage": 1 },
    "II": { "title": "기술 방안", "startPage": 15 },
    "III": { "title": "수행 방안", "startPage": 42 }
  },
  "총페이지": 80
}
```

### Step 5: 결과 보고

```
## 공통 리소스 생성 완료

- **사업명**: {사업명}
- **발주처**: {발주처}
- **총 페이지**: {총페이지}p
- **장 구성**: {장 수}개

### 장별 페이지 배분

1. **I. 일반현황** — 시작 1p, 총 14p
2. **II. 기술 방안** — 시작 15p, 총 27p
...

### 생성 파일

    data/output/{사업명_경로}/_common/
    ├── page-frame.css    ← 페이지 프레임 + 컴포넌트 스타일
    ├── page-frame.js     ← 헤더/푸터/페이지번호 자동 주입
    └── common-config.json ← 장별 시작 페이지 설정

### 다음 단계

섹션 작성을 시작하려면:
`/proposal-specialist:write-section data/output/{사업명_경로}/목차.md`
```
