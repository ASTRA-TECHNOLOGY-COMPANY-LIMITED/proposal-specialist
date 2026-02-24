# HTML 제안서 페이지 프레임 가이드

## 디렉토리 구조

```
html_output/
  _common/
    page-frame.css    ← 공통 CSS (A4 레이아웃, 헤더/푸터, 타이포그래피)
    page-frame.js     ← 공통 JS (헤더/푸터 자동 주입)
  _embedding/         ← 임베디드 차트 HTML (페이지 프레임 미적용)
  _images/            ← 배경/표지 이미지
  00_표지.html        ← 표지 (별도 레이아웃)
  00_목차.html        ← 목차 (별도 레이아웃)
  01_일반현황.html     ← JS 자동 주입 방식
  02_추진전략_및_방법.html  ← 수동 HTML 방식
  ...
```

## 페이지 구조 개요

각 페이지는 A4 크기(`210mm x 297mm`) 카드로 표시되며, 아래 구조를 따릅니다:

```
┌─────────────────────────────┐
│ .a4-page                     │
│  ┌──────────────────────────┐│
│  │ thead → .hdr (헤더)       ││
│  │  [II] 추진전략 및 방법     ││
│  │  ───────────────────────  ││
│  ├──────────────────────────┤│
│  │ tbody → .page-body       ││
│  │  (콘텐츠 영역)            ││
│  │                           ││
│  │                           ││
│  ├──────────────────────────┤│
│  │ tfoot → .ftr (푸터)       ││
│  │  ─────────────────────── ││
│  │  프로젝트명     [섹션 배지]││
│  └──────────────────────────┘│
└─────────────────────────────┘
```

`table.pf` 기반 구조를 사용하여:
- 헤더(`thead`)와 푸터(`tfoot`)가 인쇄 시 페이지마다 반복
- 푸터가 항상 페이지 하단에 고정 (콘텐츠가 짧아도)

## 방법 1: JS 자동 주입 (권장)

콘텐츠만 작성하면 헤더/푸터가 자동으로 추가됩니다.

### 템플릿

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>섹션 제목</title>
<link rel="stylesheet" href="_common/page-frame.css">
</head>
<body>

<!-- 페이지 1 -->
<div class="a4-page">
  <h2>II. 추진전략 및 방법</h2>
  <h3>1. 사업이해도</h3>
  <p>내용...</p>
</div>

<!-- 페이지 2 -->
<div class="a4-page">
  <h3>1.1 제안요청 내용 이해</h3>
  <p>내용...</p>
</div>

<!-- 마지막 페이지: last-page 클래스 추가 -->
<div class="a4-page last-page">
  <h3>5. 산출물</h3>
  <p>내용...</p>
</div>

<!-- 페이지 설정 + JS 로드 -->
<script>
var PAGE_CONFIG = {
  badge:   'II',                                    // 헤더 뱃지
  title:   '추진전략 및 방법',                         // 헤더 제목
  project: '온라인수출플랫폼 클라우드 전환 및 재구축',    // 프로젝트명
  section: 'II. 추진전략 및 방법'                      // 푸터 섹션
};
</script>
<script src="_common/page-frame.js"></script>
</body>
</html>
```

### 동작 원리

1. `page-frame.js`가 `PAGE_CONFIG`를 읽음
2. 각 `.a4-page` 안에 `table.pf > thead + tfoot + tbody` 구조 자동 생성
3. 콘텐츠는 `tbody > td.page-body`로 이동
4. 페이지 번호 자동 계산 (`1 / N`, `2 / N`, ...)
5. 이미 `table.pf`가 있는 페이지는 건너뜀 (수동 구조와 혼용 가능)

## 방법 2: 수동 HTML 구조

헤더/푸터 HTML을 직접 작성합니다. 페이지별로 다른 내용이 필요할 때 사용.

```html
<div class="a4-page">
  <table class="pf">
    <thead><tr><th>
      <div class="hdr">
        <div class="hdr-row">
          <div class="hdr-left">
            <span class="hdr-badge">II</span>
            <span class="hdr-title">추진전략 및 방법</span>
          </div>
          <span class="hdr-project">온라인수출플랫폼 클라우드 전환 및 재구축</span>
        </div>
        <div class="hdr-line"></div>
      </div>
    </th></tr></thead>
    <tfoot><tr><td>
      <div class="ftr">
        <div class="ftr-line"></div>
        <div class="ftr-row">
          <span class="ftr-text">온라인수출플랫폼 클라우드 전환 및 재구축</span>
          <span class="ftr-badge">II. 추진전략 및 방법 &mdash; 1 / 22</span>
        </div>
      </div>
    </td></tr></tfoot>
    <tbody><tr><td class="page-body">

      <!-- 여기에 콘텐츠 작성 -->
      <h2>II. 추진전략 및 방법</h2>
      <p>내용...</p>

    </td></tr></tbody>
  </table>
</div>
```

## 페이지 분리 기준

A4 한 장(297mm)에 들어갈 분량으로 콘텐츠를 나눕니다.

### 분리 포인트 선정 기준

| 우선순위 | 분리 위치 | 설명 |
|---------|----------|------|
| 1 | `<h2>`, `<h3>` 시작 전 | 대제목 단위로 분리 |
| 2 | 임베디드 차트 직전 | `<div class="embedded-chart">` 앞에서 분리 |
| 3 | 테이블 그룹 경계 | 큰 테이블 시작 전 |
| 4 | `<h4>` + 내용 블록 | 소제목 단위 |
| 5 | 단락 사이 | 분량 조절용 |

### 핵심 원칙: 소제목과 차트는 같은 페이지에 배치

소제목(`<h4>`, `<p><strong>(...)</strong></p>`)과 그 직후의 차트/도표는 **반드시 같은 `<div class="a4-page">`에 배치**합니다. 소제목만 이전 페이지 하단에 남고 차트가 다음 페이지로 넘어가면 읽는 흐름이 끊깁니다.

```
<!-- BAD: 소제목과 차트가 분리됨 -->
<div class="a4-page">
  ...이전 콘텐츠...
  <p><strong>(2) 주요 연혁</strong></p>
  <p>설명 텍스트...</p>
</div>
<div class="a4-page">
  <div class="figure-container">차트...</div>   ← 차트만 다음 페이지
</div>

<!-- GOOD: 소제목과 차트가 같은 페이지 -->
<div class="a4-page">
  ...이전 콘텐츠...
</div>
<div class="a4-page">
  <p><strong>(2) 주요 연혁</strong></p>
  <p>설명 텍스트...</p>
  <div class="figure-container">차트...</div>   ← 함께 배치
</div>
```

이 원칙은 다음 조합에 모두 적용됩니다:
- 소제목 + 임베디드 차트 (`embedded-chart`)
- 소제목 + 테이블 (`table-wrapper`)
- 소제목 + 이미지 (`figure-container`)
- 섹션 제목(`<h4>`) + 기업 개요 텍스트 + 회사 정보 테이블

### 분리 시 주의사항

- 차트(`embedded-chart`) 앞의 `<style>` 블록과 `<div class="figure-container">`가 있으면 함께 분리
- 소제목 텍스트가 이전 페이지 하단에 고립되지 않도록, 소제목부터 새 페이지 시작으로 이동
- 페이지 경계의 `<hr>`은 제거 (페이지 구분 자체가 구분선 역할)
- 마지막 `<div class="a4-page">`에 `last-page` 클래스 추가 (하단 마진 제거)

### restructure_pages.py 활용

`restructure_pages.py`는 단일 페이지 HTML을 마커 기반으로 분리하는 빌드 스크립트입니다:

```python
# split_markers에 분리 지점의 HTML 문자열을 순서대로 나열
split_markers = [
    '<h4 id="112-대표사-퀸텟시스템즈">',
    '<div class="embedded-chart-2 embedded-chart">',
    '<p><strong>(4) 대표 수행 실적</strong></p>',
    ...
]
```

실행하면 원본 HTML을 A4 페이지 단위로 분리하고, JS 자동 주입 방식의 HTML을 출력합니다.

## 공통 파일 상세

### page-frame.css

| 섹션 | 설명 |
|------|------|
| Reset & Body | 폰트, 배경색, 라인높이 |
| A4 Card | `height: 297mm`, 그림자, 좌측 스트라이프 |
| Page-Frame Table | `.pf` 테이블 (`height: 100%`로 페이지 채움) |
| Header (`.hdr`) | 뱃지 + 제목 + 프로젝트명 + 구분선 |
| Page Body | `.page-body` 패딩 (`20px 36px 24px 48px`), `height: 100%` |
| Footer (`.ftr`) | 구분선 + 프로젝트명 + 섹션 배지 |
| Typography | h1~h6, p, code, a 스타일 |
| Content Tables | `.ctbl` 테이블 스타일 |
| Lists, Blockquotes, HR | 공통 콘텐츠 스타일 |
| Figures & Charts | `.figure-container`, `.embedded-chart` |
| Print | `@media print` 인쇄 최적화 |

### page-frame.js

- `PAGE_CONFIG` 전역 변수에서 설정 읽기
- DOM API만 사용 (innerHTML 미사용, XSS 안전)
- `table.pf`가 이미 있는 페이지는 건너뜀
- 페이지 번호 자동 계산

## 페이지별 설정값

| 파일 | badge | title | section |
|------|-------|-------|---------|
| 01_일반현황 | I | 일반현황 | I. 일반현황 |
| 02_추진전략_및_방법 | II | 추진전략 및 방법 | II. 추진전략 및 방법 |
| 03_기술_및_기능 | III | 기술 및 기능 | III. 기술 및 기능 |
| 04_성능_및_품질 | IV | 성능 및 품질 | IV. 성능 및 품질 |
| 05_프로젝트_관리 | V | 프로젝트 관리 | V. 프로젝트 관리 |
| 06_프로젝트_지원 | VI | 프로젝트 지원 | VI. 프로젝트 지원 |

## Chrome Headless 렌더링

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-sandbox \
  --window-size=860,17000 \
  --force-device-scale-factor=2 \
  --screenshot=output.png \
  --default-background-color=00000000 \
  file://$(pwd)/01_일반현황.html
```

- `--force-device-scale-factor=2`: 레티나 2x 해상도
- `--window-size=860,HEIGHT`: 가로 860px (A4 210mm 근사), 세로는 전체 페이지 수에 맞게
- 전체 페이지 높이 ≈ `페이지 수 × 1130px` (A4 297mm ≈ 1123px @96dpi + 마진)

## 페이지별 스타일 추가

공통 CSS 외에 페이지 고유 스타일이 필요하면 `<head>`에 추가 `<style>` 블록을 작성합니다:

```html
<head>
<link rel="stylesheet" href="_common/page-frame.css">
<style>
/* 이 페이지 전용 스타일 */
.custom-diagram { border: 2px solid #2E75B6; padding: 16px; }
</style>
</head>
```

임베디드 차트의 인라인 `<style>` 블록(body 내부)도 그대로 사용 가능합니다.
