# HTML 컴포넌트 템플릿

모든 HTML 도표는 공유 CSS를 `<link>` 태그로 참조한다.
페이지 프레임이 필요한 경우 `page-frame.js`도 함께 로드한다.

## 기본 HTML 구조

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=794, initial-scale=1.0">
<link rel="stylesheet" href="../_common/page-frame.css">
</head>
<body>
  <!-- 도표 내용 -->
</body>
</html>
```

## 1. 데이터 테이블

요구사항 대응표, 인력 현황표, 자격 현황표 등 정형 데이터에 사용한다.

```html
<div class="table-title">표 {번호}. {제목}</div>
<table>
  <thead>
    <tr><th>구분</th><th>항목1</th><th>항목2</th><th>항목3</th></tr>
  </thead>
  <tbody>
    <tr><td>행1</td><td>값</td><td>값</td><td>값</td></tr>
  </tbody>
</table>
<div class="footnote">* 출처 및 비고 사항</div>
```

## 2. AS-IS / TO-BE 비교표

현행 시스템과 목표 시스템을 시각적으로 대비할 때 사용한다.

```html
<div class="table-title">그림 {번호}. {제목}</div>
<div class="comparison">
  <div class="comparison-left">
    <h4>AS-IS (현행)</h4>
    <ul><li>현행 항목</li></ul>
  </div>
  <div class="comparison-arrow">&rarr;</div>
  <div class="comparison-right">
    <h4>TO-BE (목표)</h4>
    <ul><li>목표 항목</li></ul>
  </div>
</div>
```

## 3. 프로세스 플로우

수행 절차, 개발 프로세스, 업무 흐름도에 사용한다.

```html
<div class="table-title">그림 {번호}. {제목}</div>
<div class="flow-container">
  <div class="flow-step">단계 1<br><small>설명</small></div>
  <div class="flow-arrow">&rarr;</div>
  <div class="flow-step">단계 2<br><small>설명</small></div>
  <div class="flow-arrow">&rarr;</div>
  <div class="flow-step">단계 3<br><small>설명</small></div>
</div>
```

## 4. KPI/수치 카드

기대효과, 성과지표, 핵심 수치를 강조할 때 사용한다.

```html
<div class="table-title">그림 {번호}. {제목}</div>
<div class="kpi-grid">
  <div class="kpi-card">
    <div class="value">99.9%</div>
    <div class="label">시스템 가용성</div>
  </div>
  <div class="kpi-card">
    <div class="value">3초</div>
    <div class="label">평균 응답시간</div>
  </div>
</div>
```

## 5. 타임라인

일정계획, 마일스톤, 단계별 추진 일정에 사용한다.

```html
<div class="table-title">그림 {번호}. {제목}</div>
<div class="timeline">
  <div class="timeline-item">
    <div class="timeline-dot">1</div>
    <div class="timeline-label">착수</div>
    <div class="timeline-desc">M+0</div>
  </div>
  <div class="timeline-item">
    <div class="timeline-dot">2</div>
    <div class="timeline-label">분석/설계</div>
    <div class="timeline-desc">M+1~2</div>
  </div>
</div>
```

## 6. 조직도

수행 조직, 추진 체계, 팀 구성을 시각화할 때 사용한다.

```html
<div class="table-title">그림 {번호}. {제목}</div>
<div class="org-chart">
  <div class="org-node">사업총괄 PM</div>
  <div style="margin: 8px 0;">
    <div class="org-node sub">기술총괄</div>
    <div class="org-node sub">품질관리</div>
    <div class="org-node sub">PM지원</div>
  </div>
</div>
```

## 7. 강조 박스

핵심 메시지, 차별화 포인트, 중요 사항을 강조할 때 사용한다.

```html
<div class="highlight-box">
  <div class="label">핵심 차별화 포인트</div>
  <p>구체적인 강조 내용을 기술한다.</p>
</div>
```

## 8. 상태 뱃지

항목의 상태, 등급, 분류를 시각적으로 표시할 때 사용한다.

```html
<span class="badge badge-primary">진행중</span>
<span class="badge badge-success">완료</span>
<span class="badge badge-warning">검토중</span>
<span class="badge badge-danger">미착수</span>
```
