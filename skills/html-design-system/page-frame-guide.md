# A4 페이지 프레임 가이드

## 페이지 프레임 구조

A4 페이지는 다음 HTML 구조로 렌더링된다:

```
.a4-page
  └── table.pf
      ├── thead (헤더: 섹션 뱃지 + 제목 + 사업명)
      ├── tfoot (푸터: 페이지 번호)
      └── tbody
          └── td.page-body (콘텐츠 영역)
```

`page-frame.js`가 로드되면 `.a4-page` 내부의 콘텐츠를 자동으로 이 구조로 래핑한다.

## PAGE_CONFIG 설정

HTML 파일에서 `page-frame.js` 로드 전에 설정한다:

```html
<script>
var PAGE_CONFIG = {
  badge: "II",           // 장 번호 뱃지
  title: "기술 방안",     // 섹션 제목
  project: "○○ 시스템 구축", // 사업명
  section: "기술 방안",   // 푸터 섹션 표시
  startPage: 1,          // 전체 기준 시작 페이지 (선택)
  totalPages: 10         // 전체 페이지 수 (선택, 기본값: 자동 계산)
};
</script>
<script src="../_common/page-frame.js"></script>
```

## 페이지 분리 기준

1. **h2, h3 제목 전**: 새 `.a4-page`에서 시작
2. **차트/도표 전**: 소제목과 차트가 같은 페이지에 오도록 배치
3. **오버플로 발생 시**: `page-frame.js`가 자동으로 다음 페이지로 분할

## 자동 분할 동작 (page-frame.js)

1. **Phase 1**: 모든 `.a4-page`에 헤더/푸터 자동 주입
2. **Phase 2a**: 콘텐츠가 A4 높이를 초과하면 자식 요소 단위로 다음 페이지에 분할
3. **Phase 2b**: 단일 자식 요소가 초과하면 CSS transform으로 축소 (최대 25%)
4. **Phase 3**: 전체 페이지 번호 업데이트

## Chrome Headless 렌더링

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-sandbox \
  --window-size=834,3000 \
  --force-device-scale-factor=2 \
  --screenshot={output.png} \
  --default-background-color=FFFFFFFF \
  file://{input.html}
```

- `--force-device-scale-factor=2`: 레티나 2x 해상도로 선명한 텍스트
- `--window-size`: HTML body width(794px) + 좌우 여백(40px) = 834px
- 폰트: `'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`

## Chrome MCP 도구 사용 (권장)

Chrome headless 직접 실행 대신 Chrome MCP 도구를 사용한다:

```
1. navigate_page: file:///절대경로/html/{파일명}.html
2. take_screenshot: {저장경로}/images/{파일명}.png
```

## 단순 도표 (페이지 프레임 불필요)

단독 도표/차트 이미지만 필요한 경우 페이지 프레임 없이 작성한다:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=794, initial-scale=1.0">
<link rel="stylesheet" href="../_common/page-frame.css">
</head>
<body>
  <div class="table-title">표 1. 제목</div>
  <table>...</table>
</body>
</html>
```

이 경우 body에 직접 콘텐츠를 배치하고, `.a4-page` 래핑과 `page-frame.js`는 생략한다.
