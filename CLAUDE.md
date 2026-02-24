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

### Commands (User-invoked via `/proposal-specialist:<command>`)
- `analyze` — Analyze company documents to extract profile and search keywords
- `search` — Search multiple platforms (G2B, K-Startup, MSS, MSIT) for matching announcements
- `evaluate` — Deep-analyze a specific bid/announcement with attachment download and RFP analysis
- `strategy` — Run the full workflow: analyze → search → evaluate with user interaction at each step
- `generate-toc` — Generate proposal TOC from RFP + company seed document (both required). Outputs `data/output/{사업명}/목차.md` with per-section metadata (배점, 핵심메시지, 도표/이미지 계획, 페이지예산)
- `write-section` — Write proposal sections based on generated TOC. Produces markdown with HTML→Chrome screenshot tables/charts and AI-generated conceptual diagrams. Supports specific section numbers: `write-section 목차.md 1 3 5`

### Agents (Subagents for deep analysis)
- **doc-analyzer** (`agents/doc-analyzer.md`): Deep company document analysis, keyword extraction
- **bid-searcher** (`agents/bid-searcher.md`): Multi-platform parallel search using MCP Tools
- **rfp-evaluator** (`agents/rfp-evaluator.md`): RFP analysis, success probability scoring, SWOT analysis
- **toc-generator** (`agents/toc-generator.md`): Proposal TOC generation with evaluation criteria ↔ company strength mapping and A4 page-fill strategy
- **section-writer** (`agents/section-writer.md`): Proposal section writing with HTML design system for tables/charts (Chrome MCP screenshots) and AI image generation for conceptual diagrams. Classifies sections into types A~K (사업이해도, 기술방안, 수행체계, etc.)

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

### Proposal Writing Flow
```
RFP document + Company seed document (both REQUIRED from user)
  → generate-toc command
      → Step 1: Read RFP (사업명, 평가기준 배점표, 요구사항, 작성요령)
      → Step 2: Read Seed (기업 강점, 실적, 인력, 기술스택)
      → Step 3: toc-generator agent
          → Evaluation criteria ↔ company strength mapping
          → Section depth allocation by 배점 weight (원칙 2)
          → 도표/이미지 planning per section (page-fill strategy)
      → Step 4: Write data/output/{사업명}/목차.md
         (YAML frontmatter + section metadata: 배점, 핵심메시지, 도표, 이미지, 페이지예산)
  → write-section command
      → Step 1: Read 목차.md (YAML frontmatter + section list)
      → Step 2: Read RFP requirements + seed data
      → Step 3: Confirm scope with user (which sections to write)
      → Step 4: Per section (sequential):
          → section-writer agent
              → Section type classification (A~K: 사업이해도, 기술방안, 수행체계...)
              → HTML tables/charts → Write to html/ → Chrome MCP → screenshot to images/
              → image_text2img (conceptual diagrams, architecture)
              → Markdown section (no markdown tables — all visuals as images)
          → Write to sections/{번호:02d}_{절제목}.md
      → Step 5-6: Progress reporting + final summary
  → data/output/{사업명}/
      ├── 목차.md           (TOC with section metadata)
      ├── sections/*.md     (page-break between sections)
      ├── html/*.html       (table/chart source HTML, editable)
      └── images/*.png      (HTML screenshots + AI diagrams)
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
/proposal-specialist:write-section data/output/사업명/목차.md
/proposal-specialist:write-section data/output/사업명/목차.md 1 3 5  # specific sections only

# Debug mode
claude --debug
```

## File Modification Guidelines

- **Markdown files** (`commands/`, `skills/`, `agents/`): These are prompt definitions. Changes affect Claude's behavior directly.
- **Shell scripts** (`scripts/`): Must always `exit 0` (non-blocking). Receive hook event JSON via stdin.
- **MCP server** (`servers/src/`): TypeScript code. Run `npm run build` after changes.
- **Data files** (`data/`):
  - `data/evaluation-templates.json`, `data/seed/`, `data/business/`: Reference data. Do not modify during normal operation.
  - `data/output/`: Runtime output generated by `generate-toc` and `write-section`. Not committed (see `.gitignore`). Contains `목차.md` (TOC), `sections/` (markdown), `html/` (editable table/chart source), `images/` (Chrome screenshots + AI diagrams).
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
HTML (body width: 700px, 시스템 폰트)
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
- AI 생성 이미지(image_text2img)는 직접 삽입하지 않고, HTML로 래핑 후 Chrome 렌더링하여 폰트/비율 일관성 확보

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

템플릿: `data/제안서/{project}/Rev.Final/template/proposal_template.pptx`

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

The section-writer agent uses a consistent HTML design system for all tables/charts. Key CSS variables defined in the agent's HTML template:

- `--primary: #1B3A5C` (navy blue), `--accent: #0078D4` (blue), `--accent-light: #E8F4FD`
- HTML body width: 794px (A4 at 96 DPI), font: Pretendard/Noto Sans KR/Malgun Gothic
- Component classes: `.table-title`, `.highlight-box`, `.badge-*`, `.flow-container`, `.kpi-grid`, `.comparison`, `.timeline`, `.org-chart`
- Section types A~K each have specific required tables/charts and AI image types defined in `agents/section-writer.md`
