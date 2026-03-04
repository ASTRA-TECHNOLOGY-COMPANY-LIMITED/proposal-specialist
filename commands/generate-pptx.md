---
description: 프레젠테이션 HTML 슬라이드를 PPTX 파일로 변환합니다 (Chrome headless + python-pptx)
---

# PPTX 변환

$ARGUMENTS 에 지정된 경로를 기반으로 프레젠테이션 HTML 슬라이드를 PPTX 파일로 변환하라.

## 인자 파싱

$ARGUMENTS 형식: `<목차파일경로>` 또는 `<presentation/index.html 경로>`

- `presentation/index.html` 경로가 직접 지정된 경우 해당 파일을 사용한다
- 목차파일경로가 지정된 경우 `data/output/{사업명_경로}/presentation/index.html`을 찾는다
- 인자가 없으면 `data/output/` 디렉토리에서 Glob Tool로 `presentation/index.html` 파일을 찾는다
- 여러 개 발견되면 목록을 보여주고 사용자에게 선택을 요청한다

**선행 조건 확인:**
presentation/index.html이 없으면 안내 후 중단한다:
"프레젠테이션이 아직 생성되지 않았습니다. 먼저 실행해주세요:
`/proposal-specialist:generate-presentation {목차파일경로}`"

## 파이프라인 개요

```
presentation/index.html (16:9, 1280×720px)
  → 슬라이드별 개별 HTML 분리
  → Chrome headless (--force-device-scale-factor=2)
  → 고해상도 PNG (2560×1440px, 레티나 품질)
  → python-pptx (16:9 와이드스크린, 이미지 풀블리드 삽입)
  → ZIP 정리 (중복 엔트리 제거)
  → 최종 PPTX
```

## 실행 절차

### Step 1: 프레젠테이션 읽기 및 분석

Read Tool로 `presentation/index.html`을 읽고 다음을 파악한다:

- `<section class="slide">` 블록 수 → 총 슬라이드 수
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
- **출력**: presentation/{사업명}_발표본.pptx

계속 진행하시겠습니까?
```

### Step 2: 슬라이드별 HTML 분리

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

# Fix CSS path: styles/ → relative to temp dir
# We'll use absolute path for CSS reference

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

print(f'Extracted {len(slides)} slides to {output_dir}')
```

**CSS 경로 처리:**
분리된 HTML에서 `href="styles/presentation.css"` 경로가 올바르게 참조되도록 `<link>` 태그의 href를 절대 경로로 변환한다. 이미지 경로도 마찬가지로 `url('images/...')` → 절대 경로로 변환한다.

### Step 3: Chrome Headless 스크린샷

각 슬라이드 HTML을 Chrome headless로 렌더링하여 PNG 스크린샷을 생성한다.

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-sandbox \
  --window-size=1280,720 \
  --force-device-scale-factor=2 \
  --screenshot={output_dir}/slide_{NNN}.png \
  --default-background-color=FFFFFFFF \
  file://{slide_html_path}
```

**Chrome 경로 확인:**
macOS와 Linux에서 Chrome 경로가 다르므로 먼저 확인한다:
- macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Linux: `google-chrome` 또는 `chromium-browser`
- `which google-chrome || which chromium-browser` 로 확인

**주의사항:**
- `--window-size=1280,720` — 정확히 슬라이드 크기
- `--force-device-scale-factor=2` — 레티나 2x 해상도 (출력: 2560×1440px)
- 슬라이드 수가 많으면 5개씩 병렬 처리: `for` 루프 + `&` + `wait`

### Step 4: PPTX 생성

Bash Tool로 Python 스크립트를 실행하여 PNG 이미지를 PPTX로 조립한다.

```python
import glob, os, sys, tempfile, zipfile
from pptx import Presentation
from pptx.util import Inches, Emu
from PIL import Image

png_dir = sys.argv[1]
output_pptx = sys.argv[2]
project_name = sys.argv[3] if len(sys.argv) > 3 else 'Presentation'

# 16:9 Widescreen dimensions (EMU)
SLIDE_W = Emu(12_192_000)  # 13.333 inches
SLIDE_H = Emu(6_858_000)   # 7.5 inches

prs = Presentation()
prs.slide_width = SLIDE_W
prs.slide_height = SLIDE_H

# Blank layout
blank_layout = prs.slide_layouts[6]  # blank

# Sort PNG files
pngs = sorted(glob.glob(os.path.join(png_dir, 'slide_*.png')))

for png_path in pngs:
    slide = prs.slides.add_slide(blank_layout)

    # Get image dimensions
    with Image.open(png_path) as img:
        img_w, img_h = img.size

    # Calculate EMU — full bleed (fit to slide)
    aspect = img_w / img_h
    slide_aspect = 12_192_000 / 6_858_000

    if aspect >= slide_aspect:
        # Image is wider or equal — fit width
        w = SLIDE_W
        h = Emu(int(12_192_000 / aspect))
        left = Emu(0)
        top = Emu(int((6_858_000 - int(12_192_000 / aspect)) / 2))
    else:
        # Image is taller — fit height
        h = SLIDE_H
        w = Emu(int(6_858_000 * aspect))
        left = Emu(int((12_192_000 - int(6_858_000 * aspect)) / 2))
        top = Emu(0)

    slide.shapes.add_picture(png_path, left, top, w, h)

# Save to temp, then clean ZIP
temp_path = output_pptx + '.tmp'
prs.save(temp_path)

# Clean ZIP (remove duplicate entries)
seen = {}
with zipfile.ZipFile(temp_path, 'r') as zin:
    for item in zin.infolist():
        seen[item.filename] = item
    with zipfile.ZipFile(output_pptx, 'w', zipfile.ZIP_DEFLATED) as zout:
        for name, info in seen.items():
            zout.writestr(info, zin.read(info.filename))

os.remove(temp_path)
print(f'Created {output_pptx} with {len(pngs)} slides')
```

**PPTX 규칙:**
- 슬라이드 크기: 16:9 와이드스크린 (12,192,000 × 6,858,000 EMU)
- 이미지는 **풀블리드** — 슬라이드 전체를 채운다
- 이미지 비율이 정확히 16:9이므로 크롭 없이 삽입
- 텍스트 요소 없음 — 모든 콘텐츠는 이미지로 렌더링됨

### Step 5: 임시 파일 정리

Bash Tool로 임시 파일을 정리한다:

```bash
rm -rf {temp_dir}/slide_*.html {temp_dir}/slide_*.png
```

분리된 HTML과 PNG 스크린샷은 삭제하되, 원본 `presentation/index.html`은 보존한다.

### Step 6: 최종 보고

```
## PPTX 변환 완료

### 출력 파일

    data/output/{사업명_경로}/presentation/{사업명}_발표본.pptx

### 요약

- **총 슬라이드**: {N}매
- **슬라이드 크기**: 16:9 와이드스크린 (33.867cm × 19.05cm)
- **이미지 해상도**: 2560×1440px (레티나 2x)
- **파일 크기**: {size} MB

### 사용 안내

1. PPTX 파일을 PowerPoint/Keynote/Google Slides에서 열기
2. 슬라이드 쇼 모드로 발표
3. 필요시 개별 슬라이드에 메모/노트 추가 가능

### 제한사항

- 이미지 기반 슬라이드이므로 텍스트 편집이 불가합니다
- 텍스트 수정이 필요하면 원본 HTML을 수정 후 다시 변환하세요:
  1. 원본 섹션 수정 → `/proposal-specialist:write-section`
  2. 프레젠테이션 재생성 → `/proposal-specialist:generate-presentation`
  3. PPTX 재변환 → `/proposal-specialist:generate-pptx`
```

## 의존성 확인

Step 실행 전 Bash Tool로 필수 도구를 확인한다:

```bash
# Chrome 확인
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ ! -f "$CHROME" ]; then
  CHROME=$(which google-chrome 2>/dev/null || which chromium-browser 2>/dev/null || echo "")
fi
[ -z "$CHROME" ] && echo "ERROR: Chrome not found" && exit 1
echo "Chrome: $CHROME"

# python-pptx 확인
python3 -c "import pptx; print(f'python-pptx {pptx.__version__}')" 2>/dev/null \
  || echo "ERROR: python-pptx not installed. Run: pip3 install --user python-pptx Pillow"

# Pillow 확인
python3 -c "import PIL; print(f'Pillow {PIL.__version__}')" 2>/dev/null \
  || echo "ERROR: Pillow not installed. Run: pip3 install --user Pillow"
```

누락된 의존성이 있으면 설치 명령을 안내하고 사용자 확인 후 진행한다.
