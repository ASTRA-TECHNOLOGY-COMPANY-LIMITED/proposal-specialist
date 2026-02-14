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

### Agents (Subagents for deep analysis)
- **doc-analyzer** (`agents/doc-analyzer.md`): Deep company document analysis, keyword extraction
- **bid-searcher** (`agents/bid-searcher.md`): Multi-platform parallel search using MCP Tools
- **rfp-evaluator** (`agents/rfp-evaluator.md`): RFP analysis, success probability scoring, SWOT analysis

### Hooks (SessionStart, non-blocking)
On session start, a shell script validates API key environment variables:
- `scripts/validate-env.sh` — Checks DATA_GO_KR_API_KEY (required) and optional keys

The script exits 0 (non-blocking) and outputs warnings to Claude's context.

### MCP Server (`servers/`)
A TypeScript MCP server (`procurement-api`) provides 11 tools for external API access:
- 5 G2B (나라장터) tools: bid search, detail, pre-specs, awards, contract process
- 2 K-Startup tools: announcements, programs
- 2 Government tools: MSS (중기부), MSIT (과기부)
- 2 File management tools: download attachment, list downloads

Configuration: `.mcp.json` at plugin root, built to `servers/dist/index.js`.

### Data (`data/`)
- `evaluation-templates.json` — Public procurement evaluation criteria templates

## Data Flow

```
Company documents
  → doc-analyzer agent (Read/Glob/Grep tools)
  → Company profile + search keywords
  → bid-searcher agent (MCP Tools, parallel)
      → G2B, K-Startup, MSS, MSIT APIs
  → Integrated results + scoring
  → rfp-evaluator agent
      → download_attachment (MCP Tool)
      → Read tool (analyze downloaded files)
  → Final report (score, SWOT, strategy)
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

### Environment Variables
- `DATA_GO_KR_API_KEY` (required): Covers G2B, K-Startup, MSS, MSIT APIs
- `BIZINFO_API_KEY` (optional): BizInfo API
- `NTIS_API_KEY` (optional): NTIS R&D API

## Building

```bash
# Build MCP server
cd servers && npm install && npm run build

# Test plugin locally
claude --plugin-dir ./proposal-specialist

# Test commands
/proposal-specialist:analyze ./company-intro.pdf
/proposal-specialist:search AI 솔루션
/proposal-specialist:evaluate 20260101001
/proposal-specialist:strategy ./company-intro.pdf

# Debug mode
claude --debug
```

## File Modification Guidelines

- **Markdown files** (`commands/`, `skills/`, `agents/`): These are prompt definitions. Changes affect Claude's behavior directly.
- **Shell scripts** (`scripts/`): Must always `exit 0` (non-blocking). Receive hook event JSON via stdin.
- **MCP server** (`servers/src/`): TypeScript code. Run `npm run build` after changes.
- **Data files** (`data/`): JSON templates. Read-only reference data.
- **`hooks/hooks.json`**: Hook configuration referencing scripts via `${CLAUDE_PLUGIN_ROOT}`.
- **`.mcp.json`**: MCP server configuration. References `${CLAUDE_PLUGIN_ROOT}` for paths and `${ENV_VAR}` for secrets.

## Design Documents

- `docs/proposal-specialist-plugin-design.md` — Comprehensive plugin design document
- `docs/mcp-server-spec.md` — MCP server implementation details with TypeScript code
- `docs/api-reference.md` — External API endpoints, parameters, and response fields
