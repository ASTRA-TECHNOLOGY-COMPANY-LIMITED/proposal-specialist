---
description: 작성된 제안서 섹션 HTML을 검증하고 표지/목차/네비게이션을 추가하여 자기완결형 HTML 패키지를 생성합니다
---

# 제안서 최종 패키징

$ARGUMENTS 에 지정된 목차 파일을 기반으로 작성된 섹션 HTML을 검증하고, 표지·목차·네비게이션을 추가하여 ZIP으로 공유 가능한 자기완결형 HTML 패키지를 생성하라.

## 인자 파싱

$ARGUMENTS 형식: `<목차파일경로>`

- 목차파일경로가 있으면 해당 파일을 사용한다
- 인자가 없으면 `data/output/` 디렉토리에서 Glob Tool로 `목차.md` 파일을 찾는다
- 목차 파일이 여러 개 발견되면 목록을 보여주고 사용자에게 선택을 요청한다

## 최종 출력 구조

```
data/output/{사업명_경로}/final/
├── index.html              ← 진입점 (표지 + 대메뉴 목차)
├── styles/
│   ├── page-frame.css      (기존 _common/ 복사)
│   ├── finalize.css         (표지, 목차, 네비, 장간지 전용)
│   ├── page-frame.js       (기존 _common/ 복사)
│   └── finalize-nav.js     (플로팅 네비게이션 바 삽입)
├── images/
│   ├── cover-hero.webp     (image_text2img 생성)
│   └── chapter-divider.webp (image_text2img 생성, 1개 공유)
├── nav-manifest.json       (네비게이션 매니페스트)
├── chapters/
│   ├── chapter-01.html     (장 I 간지 + 절 목차)
│   ├── chapter-02.html     (장 II 간지 + 절 목차)
│   └── ...
└── sections/
    ├── 01_제안사일반현황.html  (원본 HTML 복사 + 경로 변환 + nav 삽입)
    ├── 02_조직및인원현황.html
    └── ...
```

## 실행 절차

### Step 1: 목차 및 설정 읽기

Read Tool로 목차 파일을 읽고 YAML 프론트매터에서 추출한다:

- `사업명` — 프로젝트 표시명
- `사업명_경로` — 파일시스템 안전 경로명
- `발주처` — 발주 기관명
- `rfp_path` — RFP 파일 경로
- `seed_path` — 시드 파일 경로
- `평가방식`, `사업예산`, `사업기간`

Read Tool로 `data/output/{사업명_경로}/_common/common-config.json`을 읽어 장별 설정을 확보한다.

`_common/common-config.json`이 없으면 안내 후 중단한다:
"공통 리소스가 아직 생성되지 않았습니다. 먼저 실행해주세요:
`/proposal-specialist:generate-common {목차파일경로}`"

### Step 2: 섹션 인벤토리 확인

Glob Tool로 `data/output/{사업명_경로}/sections/*.html` 파일 목록을 수집한다.

목차의 섹션 목록과 대비하여 다음을 확인한다:

```
## 섹션 인벤토리

| # | 절 제목 | 파일명 | 상태 |
|---|---------|--------|------|
| 1 | 제안사 일반현황 | 01_제안사일반현황.html | ✅ 존재 |
| 2 | 조직 및 인원현황 | 02_조직및인원현황.html | ✅ 존재 |
| 3 | 사업이해도 | 03_사업이해도.html | ❌ 누락 |
...

- **작성 완료**: {N}/{M}개 섹션
- **누락 섹션**: {목록}
- **잉여 파일** (목차에 없는 파일): {목록}
```

누락 섹션이 있으면 경고하고 사용자에게 계속 진행할지 확인한다.

### Step 3: 품질 검증

각 섹션 HTML에 대해 다음을 검증한다:

#### 3-1. 요구사항 커버리지

목차 메타의 `요구사항` 필드에 나열된 요구사항 번호(SFR-xxx, PER-xxx, INR-xxx, SER-xxx, DAR-xxx, PMR-xxx, PSR-xxx 등)를 Grep Tool로 각 섹션 HTML에서 검색한다.

각 섹션별 커버리지를 계산한다:
- 목차에 명시된 요구사항 번호 중 해당 섹션 HTML에 존재하는 비율

#### 3-2. 잔존 확인 필요 항목

Grep Tool로 모든 섹션 HTML에서 `{확인 필요}` 패턴을 검색하여 잔존 개수를 세는다.

#### 3-3. 사업명/발주처 일관성

각 섹션 HTML의 `PAGE_CONFIG`에서 project 값이 목차의 사업명과 일치하는지 확인한다.

#### 3-4. 검증 결과 보고

```
## 품질 검증 결과

### 요구사항 커버리지
| 섹션 | 요구사항 | 커버 | 누락 | 커버리지 |
|------|---------|------|------|---------|
| 2.1 사업이해도 | SFR-001,004,005 | 3/3 | - | 100% |
| 3.1 시스템 아키텍처 | SFR-002,003 | 1/2 | SFR-003 | 50% |
...

### 잔존 이슈
- `{확인 필요}` 잔존: {N}건
  - sections/03_사업이해도.html (2건)
  - sections/05_기술방안.html (1건)

### 사업명 일관성: ✅ 전체 일치 / ⚠️ {N}건 불일치

계속 진행하시겠습니까? (Y/N)
```

사용자가 확인하면 다음 단계로 진행한다.

### Step 4: 표지/장간지 이미지 생성

image_text2img MCP Tool로 2개 이미지를 생성한다:

**4-1. 표지 히어로 이미지**

```
프롬프트: A professional, modern abstract background for a Korean government IT proposal cover page.
Geometric shapes with deep navy blue (#1B3A5C) and accent blue (#0078D4) tones.
Clean, corporate style with subtle digital/technology motifs.
No text. Subtle gradient from dark navy at top to lighter blue at bottom.
Aspect ratio 16:9, high quality, minimal and elegant.
```

저장 경로: `data/output/{사업명_경로}/final/images/cover-hero.webp`
비율: `16:9`

**4-2. 장간지 장식 이미지**

```
프롬프트: A subtle decorative banner for chapter divider pages in a Korean IT proposal document.
Abstract geometric pattern with navy blue (#1B3A5C) gradient.
Clean lines, professional, minimal. No text.
Suitable as a background header strip.
Aspect ratio 21:9, subtle and elegant.
```

저장 경로: `data/output/{사업명_경로}/final/images/chapter-divider.webp`
비율: `21:9`

**image_text2img 사용 불가 시 처리:**

image_text2img Tool이 사용 불가능하거나 실패하면:
- 이미지 없이 계속 진행한다 (CSS fallback 적용 — `.cover-hero`와 `.chapter-divider-hero`에 그라데이션 배경 자동 표시)
- Step 8 보고에 "이미지 생성 건너뜀 (CSS fallback 적용)" 항목을 추가한다

### Step 5: 공통 파일 생성

#### 5-1. 스타일/스크립트 파일 복사

Read Tool로 원본을 읽고 Write Tool로 복사한다:

| 원본 | 대상 |
|------|------|
| `data/output/{사업명_경로}/_common/page-frame.css` | `final/styles/page-frame.css` |
| `data/output/{사업명_경로}/_common/page-frame.js` | `final/styles/page-frame.js` |
| `${CLAUDE_PLUGIN_ROOT}/skills/html-design-system/finalize.css` | `final/styles/finalize.css` |
| `${CLAUDE_PLUGIN_ROOT}/skills/html-design-system/finalize-nav.js` | `final/styles/finalize-nav.js` |

#### 5-2. nav-manifest.json 생성

네비게이션 매니페스트를 생성하여 `final/nav-manifest.json`에 Write Tool로 저장한다:

```json
{
  "사업명": "○○ 시스템 구축",
  "chapters": [
    {
      "number": "I",
      "title": "일반현황",
      "href": "chapters/chapter-01.html",
      "sections": [
        {
          "number": "1.1",
          "title": "제안사 일반현황",
          "href": "sections/01_제안사일반현황.html"
        },
        {
          "number": "1.2",
          "title": "조직 및 인원현황",
          "href": "sections/02_조직및인원현황.html"
        }
      ]
    },
    {
      "number": "II",
      "title": "기술 방안",
      "href": "chapters/chapter-02.html",
      "sections": [...]
    }
  ]
}
```

href 값은 `final/` 디렉토리 기준 상대 경로이다.

### Step 6: index.html + chapters/*.html 생성

proposal-finalizer 에이전트를 Task Tool로 호출하여 index.html과 chapter 페이지를 생성한다.

에이전트에게 전달할 컨텍스트:

```
**프로젝트 정보:**
- 사업명: {사업명}
- 발주처: {발주처}
- 사업예산: {예산}
- 사업기간: {기간}
- 평가방식: {평가방식}
- 생성일: {오늘 날짜}

**장 구조:**
{common-config.json의 장_설정 전체}

**nav-manifest.json:**
{생성한 매니페스트 전체}

**이미지 경로:**
- 표지: images/cover-hero.webp
- 장간지: images/chapter-divider.webp

**출력 디렉토리:**
data/output/{사업명_경로}/final/

**참조 스타일:**
- page-frame.css: styles/page-frame.css
- finalize.css: styles/finalize.css

**생성할 파일:**
1. index.html — 표지 + 대메뉴 목차
2. chapters/chapter-{NN}.html — 각 장별 간지 + 절 목차
```

### Step 7: 섹션 HTML 변환 복사

원본 `sections/*.html` 파일을 `final/sections/`로 변환하여 복사한다.

각 파일에 대해 Read Tool로 원본을 읽고, 다음 변환을 적용한 후 Write Tool로 저장한다:

#### 변환 규칙 (원본 콘텐츠 100% 보존):

1. **CSS 경로 변환**: `../_common/page-frame.css` → `../styles/page-frame.css`
2. **JS 경로 변환**: `../_common/page-frame.js` → `../styles/page-frame.js`
3. **finalize.css 삽입**: `page-frame.css` 링크 다음 줄에 추가
   ```html
   <link rel="stylesheet" href="../styles/finalize.css">
   ```
4. **finalize-nav.js 삽입**: `</body>` 직전에 추가
   ```html
   <script src="../styles/finalize-nav.js"></script>
   ```
5. **작성 메모 제거**: `<!-- 작성 메모` 로 시작하여 `-->` 로 끝나는 HTML 주석 블록 전체 제거
6. **나머지 본문 일체 변경 없음**: 테이블, 차트, 다이어그램, PAGE_CONFIG 등 모든 콘텐츠 보존

변환 적용 순서: 1→2→3→4→5 (문자열 치환)

### Step 8: 최종 보고

```
## 제안서 패키징 완료

### 패키지 구성

    data/output/{사업명_경로}/final/
    ├── index.html              ← 브라우저에서 열기
    ├── nav-manifest.json
    ├── styles/
    │   ├── page-frame.css
    │   ├── page-frame.js
    │   ├── finalize.css
    │   └── finalize-nav.js
    ├── images/
    │   ├── cover-hero.webp
    │   └── chapter-divider.webp
    ├── chapters/
    │   ├── chapter-01.html     (I. {장제목})
    │   ├── chapter-02.html     (II. {장제목})
    │   └── ...
    └── sections/
        ├── 01_{절제목}.html
        ├── 02_{절제목}.html
        └── ...

### 요약

- **사업명**: {사업명}
- **발주처**: {발주처}
- **총 섹션**: {N}개
- **총 페이지**: 약 {P}p
- **표지/장간지 이미지**: {생성된 수}개 생성 (image_text2img 실패 시 "0개 — CSS fallback 적용")
- **네비게이션**: 플로팅 네비바 적용

### 공유 방법

`final/` 디렉토리를 ZIP으로 압축하여 공유하세요:

```bash
cd data/output/{사업명_경로}
zip -r 제안서_{사업명_경로}.zip final/
```

수신자는 ZIP을 풀고 `index.html`을 Chrome으로 열면 됩니다.

### 검토 가이드

1. `final/index.html`을 Chrome에서 열어 표지와 목차를 확인하세요
2. 장 카드를 클릭하여 장간지 → 섹션으로 이동을 확인하세요
3. 각 섹션에서 하단 네비게이션 바의 이전/다음 이동을 확인하세요
4. `Ctrl+P` 인쇄 미리보기에서 네비바가 숨겨지는지 확인하세요
```
