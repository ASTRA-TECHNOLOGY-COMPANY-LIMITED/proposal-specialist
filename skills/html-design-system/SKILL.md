---
name: html-design-system
description: >
  제안서 HTML 도표/차트/다이어그램 작성 시 공통 디자인 시스템을 적용합니다.
  HTML 컴포넌트 작성, 스타일 적용, Chrome 렌더링 시 사용합니다.
---

# HTML 디자인 시스템

제안서의 모든 도표, 차트, 다이어그램은 HTML로 작성하고 Chrome MCP로 스크린샷하여 이미지로 삽입한다.
이 스킬은 공통 CSS/JS 파일과 컴포넌트 템플릿을 제공한다.

## 디자인 토큰

### 컬러 팔레트

- `--primary: #1B3A5C` — 네이비 블루 (메인 컬러)
- `--primary-light: #2E5C8A` — 라이트 블루
- `--accent: #0078D4` — 액센트 블루
- `--accent-light: #E8F4FD` — 연한 하늘색 배경
- `--success: #2E7D32` — 그린 (긍정/완료)
- `--warning: #F57C00` — 오렌지 (주의)
- `--danger: #C62828` — 레드 (위험)

### 타이포그래피

- 본문: `'Pretendard', 'Noto Sans KR', 'Malgun Gothic', sans-serif`
- 본문 크기: `11pt`, 표 내부: `10pt`, 각주: `9pt`
- 페이지 프레임 폰트: `'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`

### A4 규격

- HTML body 폭: `794px` (96 DPI 기준)
- A4 실제 크기: `210mm x 297mm`
- 콘텐츠 패딩: `20px 40px`

## HTML → Chrome → PNG 워크플로우

1. **HTML 작성**: Write Tool로 `html/{섹션번호:02d}_{도표명}.html` 저장
2. **Chrome 렌더링**: `navigate_page` → `take_screenshot`으로 이미지 캡처
3. **마크다운 참조**: `![표 N. 설명](../images/{파일명}.png)`

## 공유 CSS/JS 사용법

`write-section` 명령이 실행 시 아래 파일을 `_common/` 디렉토리에 자동 복사한다:

- `_common/page-frame.css` — 페이지 프레임 + 차트 컴포넌트 통합 스타일
- `_common/page-frame.js` — 헤더/푸터 자동 주입 + 오버플로 분할

HTML 파일에서 참조:
```html
<link rel="stylesheet" href="../_common/page-frame.css">
<script src="../_common/page-frame.js"></script>
```

## 서포팅 파일

- **page-frame.css**: 페이지 프레임 레이아웃 + 차트 컴포넌트 통합 CSS
- **page-frame.js**: 헤더/푸터 자동 주입, 오버플로 페이지 분할, 페이지 번호 계산
- **component-templates.md**: HTML 컴포넌트 템플릿 (데이터 테이블, 비교표, 플로우, KPI, 타임라인, 조직도)
- **page-frame-guide.md**: A4 페이지 프레임 구조 + Chrome 렌더링 가이드
