---
name: generate-presentation
description: 작성된 제안서 섹션 HTML을 16:9 가로형 프레젠테이션(발표본) 슬라이드로 변환합니다
---

# 프레젠테이션 생성

$ARGUMENTS 에 지정된 목차 파일을 기반으로 작성된 A4 제안서 섹션 HTML을 16:9 발표용 프레젠테이션으로 변환하라.

## 인자 파싱 및 목차 파일 확보

$ARGUMENTS 형식: `<목차파일경로>`

다음 순서로 목차 파일을 확보한다:

1. **$ARGUMENTS에서 확인**: 경로가 지정되었으면 해당 파일을 사용한다
2. **자동 탐색**: 인자가 없으면 `data/output/` 디렉토리에서 Glob Tool로 `**/목차.md` 파일을 찾는다
   - 1개 발견되면 자동 사용한다
   - 여러 개 발견되면 목록을 보여주고 사용자에게 선택을 요청한다
3. **사용자에게 요청**: 목차 파일을 찾지 못하면 대화형으로 요청한다:
   "목차 파일을 찾지 못했습니다. 목차 파일 경로를 입력해주세요. (예: data/output/사업명/목차.md)
   목차가 아직 없으면 먼저 생성해주세요: `/proposal-specialist:generate-toc <RFP경로> <시드경로>`"
   - 사용자가 경로를 입력하면 해당 파일로 계속 진행한다

## 최종 출력 구조

```
data/output/{사업명_경로}/presentation/
├── index.html              ← 단일 진입점 (모든 슬라이드 임베디드)
├── styles/
│   ├── presentation.css
│   └── presentation.js
└── images/
    ├── title-hero.webp     ← image_text2img 생성 (16:9)
    ├── chapter-bg.webp     ← image_text2img 생성 (16:9)
    └── summary-bg.webp     ← image_text2img 생성 (16:9)
```

## 슬라이드 타입

| 타입 | 설명 | 이미지 |
|------|------|--------|
| title | 표지 (사업명, 발주처, 날짜, 회사명) | title-hero.webp 배경 |
| chapter-divider | 장 구분 슬라이드 | chapter-bg.webp 배경 |
| content | 본문 슬라이드 (6가지 레이아웃) | 없음 (CSS만) |
| summary | 마무리 슬라이드 | summary-bg.webp 배경 |

## 실행 절차

### Step 1: 목차 및 설정 읽기

Read Tool로 목차 파일을 읽고 YAML 프론트매터에서 추출한다:

- `사업명`, `사업명_경로`, `발주처`, `rfp_path`, `seed_path`
- `평가방식`, `사업예산`, `사업기간`

Read Tool로 `data/output/{사업명_경로}/_common/common-config.json`을 읽어 장별 설정을 확보한다.

`_common/common-config.json`이 없으면 안내 후 중단한다:
"공통 리소스가 아직 생성되지 않았습니다. 먼저 실행해주세요:
`/proposal-specialist:generate-common {목차파일경로}`"

### Step 2: 섹션 인벤토리 확인

Glob Tool로 `data/output/{사업명_경로}/sections/*.html` 파일 목록을 수집한다.

목차의 섹션 목록과 대비하여 존재/누락을 확인한다:

```
## 섹션 인벤토리

| # | 절 제목 | 파일명 | 상태 |
|---|---------|--------|------|
| 1 | 제안사 일반현황 | 01_제안사일반현황.html | ✅ 존재 |
| 2 | 사업이해도 | 02_사업이해도.html | ❌ 누락 |
...

- **작성 완료**: {N}/{M}개 섹션
```

누락 섹션이 있으면 경고하고 사용자에게 계속 진행할지 확인한다.

### Step 3: 슬라이드 계획 수립

각 섹션의 HTML을 Read Tool로 읽어 콘텐츠 분량과 구성 요소(테이블, 다이어그램, 텍스트)를 파악한다.

슬라이드 배분 원칙:
- 배점이 높은 섹션에 더 많은 슬라이드를 할당
- 1 페이지(A4) ≈ 1~2 슬라이드 기본
- 다이어그램/테이블이 있는 섹션은 +1 슬라이드 추가
- 최소 1슬라이드, 최대 섹션 페이지예산의 1.5배

레이아웃 선택 원칙 — **시각 자료 우선 (Visual-First)**:
- 원본 섹션에 테이블, 다이어그램, KPI, 플로우가 있으면 **반드시** `split`, `full-diagram`, `kpi-dashboard`, `timeline` 중 하나를 사용한다
- `text-only`는 원본에 시각 자료가 전혀 없는 경우에만 허용하며, 전체 슬라이드의 **20% 이하**로 제한한다
- 텍스트만 있는 콘텐츠도 가능하면 비교표(`two-column`), KPI 카드(`kpi-dashboard`), 프로세스(`timeline`) 등 시각 레이아웃으로 재구성한다
- 불릿포인트 나열보다 **도표·차트·인포그래픽** 중심으로 정보를 전달한다

슬라이드 계획을 사용자에게 제시하고 확인받는다:

```
## 슬라이드 계획

| 장 | 절 | 슬라이드 수 | 주요 레이아웃 |
|----|-----|-----------|-------------|
| I. 일반현황 | 1.1 제안사 일반현황 | 3 | text-only, kpi-dashboard, split |
| I. 일반현황 | 1.2 조직 및 인원현황 | 2 | split, full-diagram |
| II. 기술방안 | 2.1 사업이해도 | 4 | text-only, split, full-diagram, two-column |
...

- **총 슬라이드**: {표지 1 + 장간지 N + 콘텐츠 M + 마무리 1} = {합계}매
- **예상 발표 시간**: 약 {합계 × 1~2}분

계속 진행하시겠습니까?
```

### Step 4: 배경 이미지 생성

image_text2img MCP Tool로 3개 이미지를 생성한다:

**4-1. 표지 히어로 이미지**

```
프롬프트: A professional, modern abstract background for a Korean government IT proposal presentation title slide.
Geometric shapes with deep navy blue (#1B3A5C) and accent blue (#0078D4) tones.
Subtle digital network motifs with flowing lines. No text.
Wide cinematic composition, clean and elegant.
```

저장 경로: `data/output/{사업명_경로}/presentation/images/title-hero.webp`
비율: `16:9`, 크기: `2K`

**4-2. 장간지 배경 이미지**

```
프롬프트: A subtle professional background for chapter divider slides in a Korean IT proposal presentation.
Abstract geometric pattern with navy blue (#1B3A5C) gradient, soft light rays.
Minimal, corporate, no text. Wide format.
```

저장 경로: `data/output/{사업명_경로}/presentation/images/chapter-bg.webp`
비율: `16:9`, 크기: `2K`

**4-3. 마무리 슬라이드 배경**

```
프롬프트: A professional closing slide background for a Korean government IT proposal presentation.
Deep navy blue (#1B3A5C) with subtle accent blue (#0078D4) light accents.
Elegant, confident, forward-looking. No text. Wide format.
```

저장 경로: `data/output/{사업명_경로}/presentation/images/summary-bg.webp`
비율: `16:9`, 크기: `2K`

**image_text2img 사용 불가 시 처리:**

image_text2img Tool이 사용 불가능하거나 실패하면:
- 이미지 없이 계속 진행한다 (CSS에 그라데이션 fallback이 적용된다)
- Step 8 보고에 "이미지 생성 건너뜀 (CSS fallback 적용)" 항목을 추가한다

### Step 5: 스타일/스크립트 복사

Read Tool로 원본을 읽고 Write Tool로 복사한다:

| 원본 | 대상 |
|------|------|
| `${CLAUDE_PLUGIN_ROOT}/skills/html-design-system/presentation.css` | `presentation/styles/presentation.css` |
| `${CLAUDE_PLUGIN_ROOT}/skills/html-design-system/presentation.js` | `presentation/styles/presentation.js` |

### Step 6: 섹션별 슬라이드 생성

각 섹션에 대해 **순차적으로** presentation-writer 에이전트를 호출한다.

에이전트에게 전달할 컨텍스트:

```
**섹션 정보:**
- 파일 경로: data/output/{사업명_경로}/sections/{파일명}
- 절번호: {절번호}
- 제목: {절 제목}
- 장번호: {장번호}
- 장제목: {장 제목}
- 핵심메시지: {핵심메시지}
- 배점: {배점}
- 페이지예산: {페이지예산}

**슬라이드 계획:**
- 슬라이드 수: {N}
- 레이아웃 힌트: {레이아웃 목록}

**프로젝트 정보:**
- 사업명: {사업명}
- 발주처: {발주처}

**콘텐츠 밀도 지침:**
- 슬라이드 컨텐츠 영역을 **최대한 활용**하라. 상하좌우 과도한 공백 없이 꽉 찬 느낌을 줘라
- 단순 텍스트 나열을 **지양**하고, 테이블·차트·KPI 카드·플로우·비교표 등 **시각 자료 중심**으로 구성하라
- 원본 섹션에 도표가 있으면 반드시 슬라이드에 포함하고, 텍스트만 있어도 시각적으로 재구성하라
- `text-only` 레이아웃은 전체 슬라이드의 20% 이하로 제한

**출력 경로:**
data/output/{사업명_경로}/presentation/slides/{절번호:02d}_{절제목}.html
```

에이전트가 출력한 슬라이드 HTML 파일을 수집한다.

### Step 7: index.html 조립

모든 슬라이드를 하나의 `presentation/index.html`로 조립한다.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{사업명} — 프레젠테이션</title>
  <link rel="stylesheet" href="styles/presentation.css">
</head>
<body class="presentation-body">
<div class="slide-deck">

  <!-- ===== 표지 슬라이드 ===== -->
  <section class="slide slide-type-title">
    <div class="slide-inner" style="background-image: url('images/title-hero.webp');">
      <div class="slide-content">
        <div class="title-label anim-fade-up">기술 제안서</div>
        <h1 class="title-main anim-fade-up stagger-1">{사업명}</h1>
        <div class="title-divider anim-fade-up stagger-2"></div>
        <div class="title-meta anim-fade-up stagger-3">
          <span>{발주처}</span>
          <span class="title-meta-sep">|</span>
          <span>{날짜}</span>
        </div>
        <div class="title-company anim-fade-up stagger-4">{제안사명}</div>
      </div>
    </div>
  </section>

  <!-- ===== 장별 반복 ===== -->
  <!-- 장 구분 슬라이드 -->
  <section class="slide slide-type-chapter">
    <div class="slide-inner" style="background-image: url('images/chapter-bg.webp');">
      <div class="slide-content">
        <div class="chapter-number">{장번호}</div>
        <div>
          <div class="chapter-label anim-fade-up">CHAPTER</div>
          <h2 class="chapter-title anim-fade-up stagger-1">{장 제목}</h2>
          <div class="chapter-line anim-fade-up stagger-2"></div>
        </div>
      </div>
      <div class="slide-footer">
        <span class="slide-footer-project">{사업명}</span>
        <span class="slide-footer-page">{페이지번호}</span>
      </div>
    </div>
  </section>

  <!-- 섹션 슬라이드들 (에이전트 출력 삽입) -->
  {section slides}

  <!-- ===== 마무리 슬라이드 ===== -->
  <section class="slide slide-type-summary">
    <div class="slide-inner" style="background-image: url('images/summary-bg.webp');">
      <div class="slide-content">
        <h2 class="summary-title anim-fade-up">감사합니다</h2>
        <ul class="summary-points">
          <li class="anim-fade-up stagger-1">{핵심 제안 포인트 1}</li>
          <li class="anim-fade-up stagger-2">{핵심 제안 포인트 2}</li>
          <li class="anim-fade-up stagger-3">{핵심 제안 포인트 3}</li>
        </ul>
        <div class="summary-closing anim-fade-up stagger-4">{사업명} · {제안사명}</div>
      </div>
    </div>
  </section>

</div><!-- /slide-deck -->

<script src="styles/presentation.js"></script>
</body>
</html>
```

**조립 규칙:**
1. 표지 슬라이드 1매 → 장간지 + 섹션 슬라이드들 (반복) → 마무리 슬라이드 1매
2. 각 섹션의 에이전트 출력 `<section class="slide">` 블록을 순서대로 삽입
3. 슬라이드 footer의 페이지 번호를 전체 기준으로 재넘버링 (`{현재} / {전체}`)
4. 마무리 슬라이드의 핵심 포인트 3개는 배점이 높은 상위 섹션의 핵심메시지에서 추출
5. 이미지 경로는 `images/` 상대 경로 사용
6. presentation.js는 `</body>` 직전에 배치

### Step 8: 최종 보고

```
## 프레젠테이션 생성 완료

### 패키지 구성

    data/output/{사업명_경로}/presentation/
    ├── index.html              ← 브라우저에서 열기
    ├── styles/
    │   ├── presentation.css
    │   └── presentation.js
    └── images/
        ├── title-hero.webp
        ├── chapter-bg.webp
        └── summary-bg.webp

### 요약

- **사업명**: {사업명}
- **발주처**: {발주처}
- **총 슬라이드**: {N}매 (표지 1 + 장간지 {M} + 콘텐츠 {K} + 마무리 1)
- **예상 발표 시간**: 약 {N × 1~2}분
- **배경 이미지**: {생성된 수}개 생성 (실패 시 "0개 — CSS fallback 적용")

### 사용 방법

1. `presentation/index.html`을 Chrome에서 열기
2. **키보드**: ← → 또는 Space로 슬라이드 이동
3. **마우스**: 화면 좌/우 클릭으로 이동
4. **터치**: 좌우 스와이프로 이동
5. **F키**: 풀스크린 모드
6. **Esc키**: 슬라이드 오버뷰 그리드
7. **Home/End**: 처음/마지막 슬라이드

### 공유 방법

`presentation/` 디렉토리를 ZIP으로 압축하여 공유하세요:

```bash
cd data/output/{사업명_경로}
zip -r 발표본_{사업명_경로}.zip presentation/
```

수신자는 ZIP을 풀고 `index.html`을 Chrome으로 열면 됩니다.
```
