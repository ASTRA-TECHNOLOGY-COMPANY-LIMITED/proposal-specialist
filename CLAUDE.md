# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**proposal-specialist** is a Claude Code plugin that analyzes company documents (company introductions, technical specs) to search for relevant opportunities on Korean public procurement platforms (나라장터, K-Startup, etc.), download and analyze RFP attachments, and provide proposal success probability and strategic direction.

This is a **Claude Code plugin** composed of markdown prompts, shell scripts, JSON data files, and a TypeScript MCP server for external API access. The MCP server is the only compiled component — all other parts are pure markdown/JSON.

## Architecture

The plugin follows the Claude Code plugin structure (`.claude-plugin/plugin.json` manifest) with six component types:

### Skills (Auto-invoked by Claude)
- **company-profiler** (`skills/company-profiler/SKILL.md`): Automatically extracts company capabilities, tech stack, and track record when reading company-related documents. References industry-codes.md for procurement category mapping.
- **proposal-strategist** (`skills/proposal-strategist/SKILL.md`): Automatically applies proposal strategy perspective when working on public procurement bids or support program applications. References evaluation-criteria.md for scoring guidelines.
- **fp-estimation** (`skills/fp-estimation/SKILL.md`): Automatically provides FP estimation reference data (IFPUG weights, cost formulas, correction factors) when working on function point analysis or SW cost estimation. References fp-reference.md for detailed lookup tables.
- **bid-risk-framework** (`skills/bid-risk-framework/SKILL.md`): Automatically applies bid risk analysis frameworks (PMBOK, ISO 31000, Shipley) when analyzing RFPs, reviewing bid participation, or writing risk management sections. References risk-frameworks.md for scoring criteria and Korean procurement-specific risk data.

### Commands (User-invoked via `/proposal-specialist:<command>`)
- `analyze` — Analyze company documents to extract profile and search keywords
- `search` — Search multiple platforms (G2B, K-Startup, MSS, MSIT) for matching announcements
- `evaluate` — Deep-analyze a specific bid/announcement with attachment download and RFP analysis
- `strategy` — Run the full workflow: analyze → search → evaluate with user interaction at each step
- `generate-toc` — Generate proposal TOC from RFP + company seed document (both required). Outputs `data/output/{사업명}/목차.md` with per-section metadata (배점, 핵심메시지, 도표/도안 계획, 페이지예산)
- `generate-common` — Generate shared CSS/JS/config for section HTML files. Copies page-frame.css/js to `_common/` and creates `common-config.json` with chapter start pages. Must run before `write-section`.
- `write-section` — Write proposal sections as complete HTML pages with inline tables and HTML/CSS diagrams. Supports specific section numbers: `write-section 목차.md 1 3 5`
- `finalize` — Validate written sections, generate cover/TOC/navigation, and package into a self-contained HTML bundle ready for ZIP sharing. Adds `final/` directory with index.html entry point.
- `generate-presentation` — Transform written A4 section HTMLs into a 16:9 widescreen presentation (발표본). Generates a single-file slide deck with keyboard/touch navigation, CSS animations, and AI-generated backgrounds. Outputs `presentation/` directory with index.html entry point.
- `generate-pptx` — Convert presentation HTML slides to PPTX file using Chrome headless screenshots + python-pptx. Full-bleed 16:9 widescreen slides at retina (2x) quality. Requires Chrome and `pip3 install python-pptx Pillow`.
- `analyze-fp` — Analyze RFP or requirements documents to estimate Function Points (FP) and calculate SW development costs. Supports simplified (간이법) and standard (정규법) methods. Outputs `data/output/{사업명}/fp-analysis.md` with detailed FP breakdown and cost estimation.
- `risk-analysis` — Analyze RFP, business plans, or bid announcements to systematically identify, score, and mitigate risks for participating companies. Uses 5x5 probability-impact matrix, Bid/No-Bid decision matrix, and PMBOK mitigation strategies. Accepts file paths, bid numbers, or prior evaluate results.

### Agents (Subagents for deep analysis)
- **doc-analyzer** (`agents/doc-analyzer.md`): Deep company document analysis, keyword extraction
- **bid-searcher** (`agents/bid-searcher.md`): Multi-platform parallel search using MCP Tools
- **rfp-evaluator** (`agents/rfp-evaluator.md`): RFP analysis, success probability scoring, SWOT analysis
- **toc-generator** (`agents/toc-generator.md`): Proposal TOC generation with evaluation criteria ↔ company strength mapping and A4 page-fill strategy
- **section-writer** (`agents/section-writer.md`): Proposal section writing as complete HTML pages with inline tables and HTML/CSS diagrams. All visuals (tables, charts, architecture diagrams, infographics) are embedded directly in the section HTML — no separate image files. Classifies sections into types A~K (사업이해도, 기술방안, 수행체계, etc.)
- **proposal-finalizer** (`agents/proposal-finalizer.md`): Generates index.html (cover + main TOC) and chapters/*.html (chapter divider + section TOC) for the finalize command. Uses page-frame.css design tokens and finalize.css styles.
- **presentation-writer** (`agents/presentation-writer.md`): Converts A4 portrait section HTML to 16:9 landscape presentation slides. Extracts content, compresses text to bullet points, selects layouts (text-only, split, full-diagram, two-column, kpi-dashboard, timeline), and applies CSS animations.
- **fp-analyzer** (`agents/fp-analyzer.md`): Analyzes RFP/requirements to identify functional components (ILF/EIF/EI/EO/EQ), calculates Function Points using IFPUG standard, applies correction factors, and produces SW development cost estimation report.
- **risk-analyzer** (`agents/risk-analyzer.md`): Systematically identifies, scores, and mitigates bid participation risks across 6 categories (qualification, financial, technical, performance, legal, strategic). Uses 5x5 probability-impact matrix for scoring and Shipley Bid/No-Bid framework for go/no-go decisions.

### Hooks (SessionStart, non-blocking)
On session start, a shell script validates API key environment variables:
- `scripts/validate-env.sh` — Checks DATA_GO_KR_API_KEY (required) and optional keys

The script exits 0 (non-blocking) and outputs warnings to Claude's context.

### MCP Server (`servers/`)
A TypeScript MCP server (`procurement-api`) provides 13 tools for external API access:
- 5 G2B (나라장터) tools: bid search, detail, pre-specs, awards, contract process
- 2 K-Startup tools: announcements, programs
- 1 BizInfo (기업마당) tool: SME support program search (requires `BIZINFO_API_KEY`)
- 1 MSS (중기부) tool: announcements
- 1 MSIT (과기부) tool: announcements
- 1 NTIS tool: national R&D project search (requires `NTIS_API_KEY`)
- 2 File management tools: download attachment, list downloads

Configuration: `.mcp.json` at plugin root, built to `servers/dist/index.js`.

### Data (`data/`)
- `evaluation-templates.json` — Public procurement evaluation criteria templates
- `seed/` — Company seed documents (company profiles, capabilities) for proposal writing
- `business/` — RFP documents organized by project name and bid number
- `output/` — Generated proposal documents (TOC, sections, images) — runtime output, not committed

## Data Flow

### Bid Search & Evaluation Flow
```
Company documents
  → doc-analyzer agent (Read/Glob/Grep tools)
  → Company profile + search keywords
  → bid-searcher agent (MCP Tools, parallel)
      → G2B, K-Startup, BizInfo, MSS, MSIT, NTIS APIs
  → Integrated results + scoring
  → rfp-evaluator agent
      → download_attachment (MCP Tool)
      → Read tool (analyze downloaded files)
  → Final report (score, SWOT, strategy)
```

### FP Estimation & Cost Analysis Flow
```
RFP document or 목차.md (from generate-toc)
  → analyze-fp command
      → Step 1: Read RFP (기능요구사항, 성능, 연계, 보안, 운영환경)
      → Step 2: Read seed (optional, for reuse identification)
      → Step 3: fp-analyzer agent
          → Phase 1: Scope & boundary definition
          → Phase 2: Data function identification (ILF/EIF)
          → Phase 3: Transaction function identification (EI/EO/EQ)
          → Phase 4: Complexity assessment (정규법 only)
          → Phase 5: FP calculation (간이법 or 정규법)
          → Phase 6: Cost estimation (보정계수, 직접경비, 이윤)
          → Phase 7: Sanity check
      → Step 4: Write data/output/{사업명}/fp-analysis.md
```

### Risk Analysis Flow
```
RFP document, business plan, or bid number
  → risk-analysis command
      → Step 1: Read documents (RFP, 사업계획서, 공고 상세)
      → Step 2: Read seed (optional, for company-specific risk matching)
      → Step 3: Confirm analysis scope (full or selective categories)
      → Step 4: risk-analyzer agent
          → Phase 1: Document analysis & context extraction
          → Phase 2: Risk identification across 6 categories
          → Phase 3: 5x5 probability-impact scoring
          → Phase 4: Bid/No-Bid decision matrix (7 criteria, weighted)
          → Phase 5: Mitigation strategy (PMBOK 6 response types)
          → Phase 6: Top 5 critical risks prioritization
      → Step 5: Risk analysis report output
```

### Proposal Writing Flow
```
RFP document + Company seed document (both REQUIRED from user)
  → generate-toc command
      → Step 1: Read RFP (사업명, 평가기준 배점표, 요구사항, 작성요령)
      → Step 2: Read Seed (기업 강점, 실적, 인력, 기술스택)
      → Step 3: toc-generator agent
          → Evaluation criteria ↔ company strength mapping
          → Section depth allocation by 배점 weight (원칙 2)
          → 도표/도안 planning per section (page-fill strategy)
      → Step 4: Write data/output/{사업명}/목차.md
         (YAML frontmatter + section metadata: 배점, 핵심메시지, 도표, 도안, 페이지예산)
  → generate-common command
      → Step 1: Read 목차.md (장 구조, 페이지예산)
      → Step 2: Calculate chapter start pages
      → Step 3: Copy page-frame.css/js to _common/
      → Step 4: Write _common/common-config.json
  → write-section command
      → Step 1: Read 목차.md + _common/common-config.json
      → Step 2: Read RFP requirements + seed data
      → Step 3: Confirm scope with user (which sections to write)
      → Step 4: Per section (sequential):
          → section-writer agent
              → Section type classification (A~K: 사업이해도, 기술방안, 수행체계...)
              → Inline HTML tables + HTML/CSS diagrams (no separate files)
              → Complete HTML page with PAGE_CONFIG, shared CSS/JS
          → Write to sections/{번호:02d}_{절제목}.html
      → Step 5-6: Progress reporting + final summary
  → finalize command
      → Step 1: Read 목차.md + common-config.json
      → Step 2: Section inventory check (missing/extra files)
      → Step 3: Quality validation (requirement coverage, {확인 필요} residuals)
      → Step 4: Cover/chapter-divider image generation (image_text2img)
      → Step 5: Copy shared files + generate finalize.css/nav.js + nav-manifest.json
      → Step 6: proposal-finalizer agent → index.html + chapters/*.html
      → Step 7: Section HTML transform copy (path rewrite + nav injection)
      → Step 8: Final report + ZIP instructions
  → data/output/{사업명}/
      ├── 목차.md              (TOC with section metadata)
      ├── fp-analysis.md       (FP estimation & cost analysis report)
      ├── sections/*.html      (complete HTML pages with headers/footers/page numbers)
      ├── _common/
      │   ├── page-frame.css   (shared page frame + component styles)
      │   ├── page-frame.js    (auto header/footer/page split/numbering)
      │   └── common-config.json (chapter start pages config)
      ├── final/               (self-contained HTML package, ready for ZIP)
      │   ├── index.html        (entry point: cover + main TOC)
      │   ├── nav-manifest.json (navigation manifest)
      │   ├── styles/           (page-frame.css/js + finalize.css/nav.js)
      │   ├── images/           (cover-hero.webp, chapter-divider.webp)
      │   ├── chapters/         (chapter-NN.html: divider + section TOC)
      │   └── sections/         (transformed copies with nav injection)
      └── presentation/         (16:9 slide deck, ready for ZIP)
          ├── index.html        (single entry point, all slides embedded)
          ├── styles/           (presentation.css + presentation.js)
          └── images/           (title-hero.webp, chapter-bg.webp, summary-bg.webp)
```

## Key Conventions

### Plugin Structure (follows standard-enforcer pattern)
- Commands: markdown files in `commands/` with `---description---` frontmatter and `$ARGUMENTS` placeholder
- Agents: markdown files in `agents/` with `---name, description---` frontmatter
- Skills: `SKILL.md` in `skills/{skill-name}/` with reference docs in the same directory
- Hooks: `hooks/hooks.json` with `${CLAUDE_PLUGIN_ROOT}` variable for portable paths
- Scripts: shell scripts that receive hook event JSON via stdin, always exit 0

### MCP Server
- TypeScript with `@modelcontextprotocol/sdk` v1.x
- Zod schemas for tool input validation
- stdio transport (Claude Code plugin default)
- Environment variables for API keys (never hardcoded)
- Download files stored in `${CLAUDE_PLUGIN_ROOT}/downloads/`
- Each tool module (`servers/src/tools/*.ts`) exports a `register*Tools(server)` function called from `index.ts`
- Shared API client in `servers/src/utils/api-client.ts` handles data.go.kr standard response format

### Environment Variables
- `DATA_GO_KR_API_KEY` (required): Covers G2B, K-Startup, MSS, MSIT APIs
- `BIZINFO_API_KEY` (optional): BizInfo API
- `NTIS_API_KEY` (optional): NTIS R&D API

## Building

```bash
# Build MCP server
cd servers && npm install && npm run build

# Watch mode for development
cd servers && npm run dev

# Test plugin locally
claude --plugin-dir .

# Test commands
/proposal-specialist:analyze ./company-intro.pdf
/proposal-specialist:search AI 솔루션
/proposal-specialist:evaluate 20260101001
/proposal-specialist:strategy ./company-intro.pdf
/proposal-specialist:generate-toc data/business/사업명/제안요청서.pdf data/seed/회사명/시드.md
/proposal-specialist:generate-common data/output/사업명/목차.md
/proposal-specialist:write-section data/output/사업명/목차.md
/proposal-specialist:write-section data/output/사업명/목차.md 1 3 5  # specific sections only
/proposal-specialist:finalize data/output/사업명/목차.md
/proposal-specialist:generate-presentation data/output/사업명/목차.md
/proposal-specialist:generate-pptx data/output/사업명/목차.md
/proposal-specialist:analyze-fp data/business/사업명/제안요청서.pdf
/proposal-specialist:analyze-fp data/output/사업명/목차.md 간이법 이윤율=15
/proposal-specialist:risk-analysis data/business/사업명/제안요청서.pdf
/proposal-specialist:risk-analysis data/business/사업명/제안요청서.pdf data/seed/회사명/시드.md

# Debug mode
claude --debug
```

## File Modification Guidelines

- **Markdown files** (`commands/`, `skills/`, `agents/`): These are prompt definitions. Changes affect Claude's behavior directly.
- **Shell scripts** (`scripts/`): Must always `exit 0` (non-blocking). Receive hook event JSON via stdin.
- **MCP server** (`servers/src/`): TypeScript code. Run `npm run build` after changes.
- **Data files** (`data/`):
  - `data/evaluation-templates.json`, `data/seed/`, `data/business/`: Reference data. Do not modify during normal operation.
  - `data/output/`: Runtime output generated by `generate-toc`, `generate-common`, `write-section`, `finalize`, and `generate-presentation`. Not committed (see `.gitignore`). Contains `목차.md` (TOC), `sections/*.html` (complete HTML pages with inline tables and diagrams), `_common/` (shared CSS/JS/config), `final/` (self-contained HTML package with cover, navigation, and transformed sections), `presentation/` (16:9 slide deck with single index.html entry point).
- **`hooks/hooks.json`**: Hook configuration referencing scripts via `${CLAUDE_PLUGIN_ROOT}`.
- **`.mcp.json`**: MCP server configuration. References `${CLAUDE_PLUGIN_ROOT}` for paths and `${ENV_VAR}` for secrets.

## Version Management (MANDATORY before push)

Claude Code는 `plugin.json`의 version 필드로 플러그인 업데이트 여부를 판단한다. **버전을 올리지 않으면 기존 사용자의 캐시가 갱신되지 않아 변경사항이 반영되지 않는다.**

### Version Bump Rule

**코드 변경 후 push 전에 반드시 버전을 올려야 한다.** 두 파일을 동시에 수정한다:

1. `.claude-plugin/plugin.json` → `"version"` 필드
2. `.claude-plugin/marketplace.json` → `plugins[0].version` 필드

두 파일의 버전은 항상 동일하게 유지한다.

### Semantic Versioning (semver)

| 변경 유형 | 버전 | 커밋 prefix | 예시 |
|-----------|------|------------|------|
| 버그 수정 | PATCH (x.y.Z) | `fix:` | 1.1.1 → 1.1.2 |
| 새 기능 추가 | MINOR (x.Y.0) | `feat:` | 1.1.2 → 1.2.0 |
| 호환성 깨지는 변경 | MAJOR (X.0.0) | `feat!:` / `BREAKING CHANGE` | 1.2.0 → 2.0.0 |
| 문서/설정만 변경 | PATCH (x.y.Z) | `docs:` / `chore:` | 1.1.1 → 1.1.2 |

### Push Workflow

```bash
# 1. 코드 변경 완료
# 2. plugin.json + marketplace.json 버전 동시 수정
# 3. 커밋 (버전 bump 포함)
git commit -m "feat: add new search filter

bump version to 1.2.0"
# 4. push
git push origin staging
# 5. main 머지 시에도 동일 버전이 반영됨
```

### 주의사항

- `plugin.json`과 `marketplace.json` 모두에 version이 있을 경우, **`plugin.json`이 우선**한다. 반드시 두 파일을 동일하게 유지할 것.
- `--plugin-dir`로 로컬 테스트할 때는 버전과 무관하게 항상 최신 코드가 로드된다.
- 마켓플레이스를 통해 설치한 사용자는 버전이 바뀌어야만 `/plugin update`로 업데이트를 받을 수 있다.

## PPTX Generation Pipeline

Markdown 제안서 → PPTX 변환 시 아래 파이프라인을 따른다.

### Pipeline: HTML → Chrome Screenshot → PPTX

```
HTML (body width: 794px, 시스템 폰트)
  → Chrome headless (--force-device-scale-factor=2, 레티나 품질)
  → 고해상도 PNG (1400px 폭, 정확한 폰트 렌더링)
  → python-pptx (full-width 삽입, 자동 페이지 분할)
  → ZIP 정리 (중복 엔트리 제거)
  → 최종 PPTX
```

### Image Insertion Rules

- **가로는 항상 content full width (6,480,000 EMU) 고정** — 절대로 이미지를 가로 축소하지 않는다
- 세로는 원본 비율(aspect ratio)에 맞게 자동 계산
- 한 슬라이드에 안 들어가면 이미지를 **자동 crop & split** → 다음 슬라이드에 이어서 배치
- 분할된 각 슬라이드에도 동일한 크롬(헤더, 섹션 뱃지, 페이지번호) 적용
- 외부 이미지는 직접 삽입하지 않고, HTML로 래핑 후 Chrome 렌더링하여 폰트/비율 일관성 확보

### HTML Rendering (Chrome Headless)

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-sandbox \
  --window-size={body_width+40},3000 \
  --force-device-scale-factor=2 \
  --screenshot={output.png} \
  --default-background-color=FFFFFFFF \
  file://{input.html}
```

- `--force-device-scale-factor=2`: 레티나 2x 해상도로 선명한 텍스트
- HTML body width에서 자동 추출하여 window-size 설정
- 폰트: `'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`

### PPTX Template Design System

슬라이드는 python-pptx의 `Presentation()`으로 직접 생성 (외부 템플릿 파일 불필요).

| 요소 | 위치 (EMU) | 스타일 |
|------|-----------|--------|
| Slide size | 7,560,000 × 10,692,000 | A4 세로 (8.27" × 11.69") |
| Left stripe | (0, 0) w=180,000 | fill: #2E75B6 |
| Top-left triangle | (0, 0) w=720,000 h=540,000 | fill: #2E75B6 |
| Project name | (2,520,000, 288,000) | 8pt, #999999, right-align |
| Section name | (2,520,000, 468,000) | 9pt bold, #1A3C5E, right-align |
| Section badge | (540,000, 1,260,000) w=432,000 | 16pt bold white on #2E75B6 |
| Section title | (1,080,000, 1,260,000) | 16pt bold, #1A3C5E |
| Divider | (540,000, 1,620,000) w=6,480,000 h=18,000 | fill: #2E75B6 |
| Page number | (7,128,000, 10,260,000) w=251,999 | 8pt bold white on #C0392B |
| Content area | left=540,000, top≈1,750,000 | width=6,480,000, bottom limit≈10,100,000 |

### PPTX Slide Deletion (python-pptx)

python-pptx에서 슬라이드 삭제 시 orphaned XML이 ZIP에 남는다. 반드시 저장 후 ZIP 정리:

```python
# 1. 슬라이드 삭제 (XML 레벨)
nsmap = {'p': '...presentationml...', 'r': '...relationships...'}
sldIdLst = prs.part._element.find('.//p:sldIdLst', nsmap)
for sldId in list(sldIdLst)[1:]:  # keep first slide
    rId = sldId.get('{...relationships...}id')
    sldIdLst.remove(sldId)
    del prs.part.rels[rId]

# 2. 저장 후 ZIP 중복 제거
prs.save(temp_path)
seen = {}
with zipfile.ZipFile(temp_path) as zin:
    for item in zin.infolist():
        seen[item.filename] = item  # last entry wins
    with zipfile.ZipFile(output_path, 'w', ZIP_DEFLATED) as zout:
        for name, info in seen.items():
            zout.writestr(info, zin.read(info.filename))
```

### Dependencies

```bash
pip3 install --user --break-system-packages python-pptx Pillow
```

## Section Writer Design System

The section-writer agent outputs **complete HTML pages** with all visuals inline. No separate image files are generated — all tables, charts, and diagrams are HTML/CSS/JS within the section file.

### Output format
- Each section is a standalone `.html` file in `sections/`
- References shared `_common/page-frame.css` and `_common/page-frame.js`
- `PAGE_CONFIG` variable sets chapter badge, title, project name, start page, total pages
- `page-frame.js` auto-injects headers/footers, handles page overflow splitting, and numbers pages

### Design tokens
- `--primary: #1B3A5C` (navy blue), `--accent: #0078D4` (blue), `--accent-light: #E8F4FD`
- HTML body width: 794px (A4 at 96 DPI), font: Pretendard/Noto Sans KR/Malgun Gothic

### Component types
- **Tables** (`<table>`): Data tables, requirement mapping, comparison tables
- **CSS diagrams** (`.flow-container`, `.org-chart`, `.comparison`, `.kpi-grid`, `.timeline`): Architecture, process flows, org charts, infographics
- **Inline SVG**: Complex shapes/paths when CSS alone is insufficient
- Section types A~K each have specific required tables and HTML/CSS diagram types defined in `skills/section-type-guide/type-strategies.md`
