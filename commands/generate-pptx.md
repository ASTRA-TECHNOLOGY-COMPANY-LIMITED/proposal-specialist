---
name: generate-pptx
description: 프레젠테이션 HTML 슬라이드를 PPTX 파일로 변환합니다 (dom-to-pptx, 네이티브 요소 변환)
---

# PPTX 변환

$ARGUMENTS 에 지정된 경로를 기반으로 프레젠테이션 HTML 슬라이드를 PPTX 파일로 변환하라.

## 인자 파싱 및 프레젠테이션 파일 확보

$ARGUMENTS 형식: `<목차파일경로>` 또는 `<presentation/index.html 경로>`

다음 순서로 프레젠테이션 파일을 확보한다:

1. **$ARGUMENTS에서 확인**:
   - `presentation/index.html` 경로가 직접 지정된 경우 해당 파일을 사용한다
   - 목차파일경로가 지정된 경우 `data/output/{사업명_경로}/presentation/index.html`을 찾는다
2. **자동 탐색**: 인자가 없으면 `data/output/` 디렉토리에서 Glob Tool로 `**/presentation/index.html` 파일을 찾는다
   - 1개 발견되면 자동 사용한다
   - 여러 개 발견되면 목록을 보여주고 사용자에게 선택을 요청한다
3. **사용자에게 요청**: 프레젠테이션 파일을 찾지 못하면 대화형으로 요청한다:
   "프레젠테이션 파일을 찾지 못했습니다. 다음 중 하나를 입력해주세요:
   - 프레젠테이션 경로 (예: data/output/사업명/presentation/index.html)
   - 목차 파일 경로 (예: data/output/사업명/목차.md)
   프레젠테이션이 아직 없으면 먼저 생성해주세요: `/proposal-specialist:generate-presentation <목차파일경로>`"
   - 사용자가 경로를 입력하면 해당 파일로 계속 진행한다

**선행 조건 확인:**
presentation/index.html이 확보된 경로에 존재하지 않으면 사용자에게 안내한다:
"프레젠테이션이 아직 생성되지 않았습니다. 먼저 실행해주세요:
`/proposal-specialist:generate-presentation {목차파일경로}`"

## 파이프라인 개요

```
presentation/index.html (16:9, 1280x720px)
  -> 슬라이드별 개별 HTML 분리 (standalone)
  -> Puppeteer로 각 슬라이드 HTML 열기
  -> dom-to-pptx로 DOM -> 네이티브 PPTX 요소 변환
  -> 편집 가능한 텍스트/도형/테이블이 포함된 PPTX
  -> 최종 PPTX
```

**핵심 차이점 (기존 스크린샷 방식 대비):**
- HTML의 텍스트 -> PPTX 네이티브 텍스트 박스 (편집 가능)
- HTML의 도형/배경 -> PPTX 네이티브 Shape (편집 가능)
- HTML의 테이블 -> PPTX 네이티브 테이블 (편집 가능)
- SVG -> 벡터 Shape으로 변환 (PowerPoint에서 "도형으로 변환" 가능)

## 실행 절차

### Step 1: 프레젠테이션 읽기 및 분석

Read Tool로 `presentation/index.html`을 읽고 다음을 파악한다:

- `<section class="slide">` 블록 수 -> 총 슬라이드 수
- 각 슬라이드의 타입 (slide-type-title, slide-type-chapter, slide-type-summary, 콘텐츠)
- CSS/JS/이미지 참조 경로

사용자에게 변환 계획을 보고한다:

```
## PPTX 변환 계획

- **소스**: presentation/index.html
- **총 슬라이드**: {N}매
  - 표지: 1매
  - 장간지: {M}매
  - 콘텐츠: {K}매
  - 마무리: 1매
- **변환 방식**: dom-to-pptx (네이티브 요소, 편집 가능)
- **출력**: presentation/{사업명}_발표본.pptx

계속 진행하시겠습니까?
```

### Step 2: 의존성 확인 및 설치

Bash Tool로 필수 도구를 확인한다:

```bash
# Node.js 확인
node --version || echo "ERROR: Node.js not found"

# puppeteer 확인 (없으면 설치)
node -e "require('puppeteer')" 2>/dev/null \
  && echo "puppeteer OK" \
  || echo "NEED_INSTALL: puppeteer"

# dom-to-pptx 확인 (없으면 설치)
node -e "require('dom-to-pptx')" 2>/dev/null \
  && echo "dom-to-pptx OK" \
  || echo "NEED_INSTALL: dom-to-pptx"
```

누락된 패키지가 있으면 설치를 안내하고 사용자 확인 후 진행한다:

```bash
npm install --no-save puppeteer dom-to-pptx
```

### Step 3: 슬라이드별 HTML 분리

Bash Tool로 Python 스크립트를 실행하여 index.html에서 각 슬라이드를 개별 HTML 파일로 분리한다.

```python
import re, os, sys

index_path = sys.argv[1]
output_dir = sys.argv[2]

with open(index_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Extract <head> content
head_match = re.search(r'<head>(.*?)</head>', html, re.DOTALL)
head_content = head_match.group(1) if head_match else ''

# Extract all <section class="slide ..."> blocks
slides = re.findall(r'(<section\s+class="slide[^"]*".*?</section>)', html, re.DOTALL)

os.makedirs(output_dir, exist_ok=True)

for i, slide_html in enumerate(slides):
    # Create standalone HTML for each slide
    standalone = f'''<!DOCTYPE html>
<html lang="ko">
<head>
{head_content}
<style>
  body {{ margin: 0; padding: 0; overflow: hidden; background: #fff; }}
  .slide {{ position: static; opacity: 1; pointer-events: auto; width: 1280px; height: 720px; display: flex; align-items: center; justify-content: center; }}
  .slide-inner {{ transform: none !important; box-shadow: none; border-radius: 0; }}
  /* Force all animations to final state */
  [class*="anim-"] {{ opacity: 1 !important; transform: none !important; transition: none !important; }}
</style>
</head>
<body class="presentation-body">
{slide_html}
</body>
</html>'''

    slide_path = os.path.join(output_dir, f'slide_{i+1:03d}.html')
    with open(slide_path, 'w', encoding='utf-8') as f:
        f.write(standalone)

print(f'Extracted {{len(slides)}} slides to {{output_dir}}')
```

**CSS 경로 처리:**
분리된 HTML에서 `href="styles/presentation.css"` 경로가 올바르게 참조되도록 `<link>` 태그의 href를 절대 경로로 변환한다. 이미지 경로도 마찬가지로 `url('images/...')` -> 절대 경로로 변환한다.

### Step 4: dom-to-pptx로 PPTX 생성

Bash Tool로 Node.js 스크립트를 실행한다. 이 스크립트가 Puppeteer로 각 슬라이드 HTML을 열고, dom-to-pptx를 주입하여 네이티브 PPTX 요소로 변환한다.

```javascript
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const slideDir = process.argv[2];     // 분리된 슬라이드 HTML 디렉토리
const outputPptx = process.argv[3];   // 출력 PPTX 경로
const presDir = process.argv[4];      // presentation/ 디렉토리 (CSS/이미지 원본)

// dom-to-pptx 번들 경로
const domToPptxBundle = require.resolve('dom-to-pptx/dist/dom-to-pptx.bundle.js');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
  });

  // 슬라이드 HTML 파일 목록 (정렬)
  const slideFiles = fs.readdirSync(slideDir)
    .filter(f => f.match(/^slide_\d+\.html$/))
    .sort();

  console.log(`Processing ${slideFiles.length} slides...`);

  // --- 방법: 모든 슬라이드를 하나의 페이지에 로드하여 일괄 변환 ---
  // 통합 HTML 생성 (모든 슬라이드를 개별 div로 포함)
  const combinedSlides = [];
  for (const file of slideFiles) {
    const html = fs.readFileSync(path.join(slideDir, file), 'utf-8');
    // <body> 내용만 추출
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
    if (bodyMatch) {
      const slideId = file.replace('.html', '');
      combinedSlides.push(
        `<div id="${slideId}" style="width:1280px;height:720px;overflow:hidden;position:relative;">${bodyMatch[1]}</div>`
      );
    }
  }

  // 첫 번째 슬라이드 HTML에서 <head> 추출 (CSS 참조 포함)
  const firstHtml = fs.readFileSync(path.join(slideDir, slideFiles[0]), 'utf-8');
  const headMatch = firstHtml.match(/<head>([\s\S]*?)<\/head>/);
  const headContent = headMatch ? headMatch[1] : '';

  const combinedHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
${headContent}
<style>
  body { margin: 0; padding: 0; background: #fff; }
  .slide { position: static; opacity: 1; pointer-events: auto; width: 1280px; height: 720px; }
  .slide-inner { transform: none !important; box-shadow: none; border-radius: 0; }
  [class*="anim-"] { opacity: 1 !important; transform: none !important; transition: none !important; }
</style>
</head>
<body>
${combinedSlides.join('\n')}
</body>
</html>`;

  const combinedPath = path.join(slideDir, '_combined.html');
  fs.writeFileSync(combinedPath, combinedHtml, 'utf-8');

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

  // 파일 프로토콜로 로드
  await page.goto(`file://${combinedPath}`, { waitUntil: 'networkidle0', timeout: 60000 });

  // dom-to-pptx 번들 주입
  const bundleCode = fs.readFileSync(domToPptxBundle, 'utf-8');
  await page.evaluate(bundleCode);

  // 슬라이드 요소 선택 및 PPTX 변환
  const pptxBuffer = await page.evaluate(async (slideIds) => {
    // dom-to-pptx는 전역 domToPptx로 노출됨
    const elements = slideIds.map(id => document.getElementById(id));

    const blob = await domToPptx.exportToPptx(elements, {
      fileName: 'export.pptx',
      skipDownload: true,
      autoEmbedFonts: true
    });

    // Blob -> ArrayBuffer -> Base64
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }, slideFiles.map(f => f.replace('.html', '')));

  // Base64 -> Buffer -> 파일 저장
  const buffer = Buffer.from(pptxBuffer, 'base64');
  fs.writeFileSync(outputPptx, buffer);

  console.log(`Created ${outputPptx} with ${slideFiles.length} slides (native elements)`);

  // 정리
  await browser.close();
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
```

**실행 명령:**

```bash
node /tmp/generate-pptx.js {slide_temp_dir} {output_pptx_path} {presentation_dir}
```

**핵심 포인트:**
- `skipDownload: true` — 브라우저 다운로드 대신 Blob 반환
- `autoEmbedFonts: true` — 사용된 폰트 자동 감지 및 임베딩
- 각 슬라이드 div가 PPTX의 개별 슬라이드로 변환됨
- 텍스트, 도형, 테이블이 모두 네이티브 PPTX 요소로 매핑됨

### Step 5: 임시 파일 정리

Bash Tool로 임시 파일을 정리한다:

```bash
rm -rf {temp_dir}/slide_*.html {temp_dir}/_combined.html
```

분리된 HTML은 삭제하되, 원본 `presentation/index.html`은 보존한다.
생성된 Node.js 스크립트(`/tmp/generate-pptx.js`)도 삭제한다.

### Step 6: 최종 보고

```
## PPTX 변환 완료

### 출력 파일

    data/output/{사업명_경로}/presentation/{사업명}_발표본.pptx

### 요약

- **총 슬라이드**: {N}매
- **슬라이드 크기**: 16:9 와이드스크린 (33.867cm x 19.05cm)
- **변환 방식**: dom-to-pptx (네이티브 요소)
- **파일 크기**: {size} MB

### 편집 가능한 요소

- **텍스트**: 모든 텍스트가 PowerPoint 텍스트 박스로 변환 (직접 편집 가능)
- **도형**: CSS 도형/배경이 네이티브 Shape으로 변환
- **테이블**: HTML 테이블이 PowerPoint 테이블로 변환
- **SVG**: 벡터 도형으로 변환 (PowerPoint에서 "도형으로 변환" 가능)

### 사용 안내

1. PPTX 파일을 PowerPoint/Keynote/Google Slides에서 열기
2. **텍스트 직접 편집 가능** — 오타 수정, 내용 추가/삭제
3. **도형/색상 변경 가능** — PowerPoint 서식 도구 활용
4. 슬라이드 쇼 모드로 발표

### 폰트 안내

- PPTX에 사용된 웹 폰트가 임베딩됩니다
- 발표 PC에 해당 폰트가 없으면 PowerPoint가 유사 폰트로 대체합니다
- 권장: 발표 전 폰트 렌더링 확인
```

## 의존성 요약

| 패키지 | 용도 | 설치 |
|--------|------|------|
| `puppeteer` | Headless Chrome 제어, DOM 렌더링 | `npm install puppeteer` |
| `dom-to-pptx` | DOM 요소 -> 네이티브 PPTX 변환 | `npm install dom-to-pptx` |

**기존 의존성 불필요:**
- ~~python-pptx~~ -> dom-to-pptx로 대체
- ~~Pillow~~ -> 이미지 스크린샷 불필요
- ~~Chrome CLI 직접 호출~~ -> Puppeteer가 Chrome 관리

## 트러블슈팅

### 폰트가 깨지는 경우
dom-to-pptx의 `autoEmbedFonts`가 웹 폰트를 자동 임베딩하지만, 로컬 시스템 폰트는 임베딩하지 않는다.
`fonts` 옵션으로 수동 지정할 수 있다:

```javascript
await domToPptx.exportToPptx(elements, {
  skipDownload: true,
  fonts: [
    { name: 'Pretendard', url: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/woff2/Pretendard-Regular.woff2' },
    { name: 'Noto Sans KR', url: 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.woff2' }
  ]
});
```

### CORS 에러로 이미지가 누락되는 경우
`file://` 프로토콜로 로드하므로 외부 이미지 URL은 CORS 제한에 걸릴 수 있다.
이미지가 `images/` 디렉토리에 로컬 파일로 존재하면 문제없다.

### 레이아웃이 원본과 다른 경우
dom-to-pptx는 computed style을 기반으로 변환한다. 슬라이드 HTML의 CSS가 정확히 렌더링되도록:
- `waitUntil: 'networkidle0'`으로 모든 리소스 로드 대기
- `deviceScaleFactor: 2`로 고해상도 렌더링
- 애니메이션을 최종 상태로 강제 (`opacity: 1, transform: none`)
