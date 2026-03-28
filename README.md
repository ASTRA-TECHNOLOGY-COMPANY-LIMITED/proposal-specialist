# proposal-specialist

기업 문서를 분석하여 공공조달 입찰공고 및 지원사업을 탐색하고, 제안서를 작성하는 Claude Code 플러그인입니다.

나라장터(G2B), K-스타트업, 중소벤처기업부, 과학기술정보통신부, 기업마당, NTIS 등 주요 공공 플랫폼의 API를 통해 공고를 검색하고, 첨부 제안요청서(RFP)를 다운로드하여 분석한 후, 수주 확률과 전략적 방향을 제시합니다.

## 사전 요구사항

- **Claude Code** v1.0.33 이상 (`claude --version`으로 확인)
- **Node.js** 18 이상
- **Git** (마켓플레이스 설치 시 필요)
- **공공데이터포털 API 키** (필수)

## 설치

### 방법 1: 마켓플레이스에서 설치 (권장)

Claude Code의 플러그인 마켓플레이스를 통해 간편하게 설치할 수 있습니다.

```bash
# 1. 마켓플레이스 추가
claude plugin marketplace add ASTRA-TECHNOLOGY-COMPANY-LIMITED/proposal-specialist

# 2. 플러그인 설치
claude plugin install proposal-specialist@proposal-specialist-marketplace
```

설치 후 Claude Code를 재시작하면 플러그인이 자동으로 로드됩니다.

> `/plugin` 명령어를 실행하면 인터랙티브 UI가 열려 Discover/Installed/Marketplaces 탭에서 플러그인을 관리할 수 있습니다.

#### 설치 스코프 옵션

플러그인은 세 가지 스코프로 설치할 수 있습니다:

| 스코프 | 설정 파일 | 적용 범위 |
|--------|----------|-----------|
| `user` (기본) | `~/.claude/settings.json` | 모든 프로젝트에서 사용 |
| `project` | `.claude/settings.json` | 팀원과 공유 (Git 커밋) |
| `local` | `.claude/settings.local.json` | 로컬 전용 (gitignored) |

```bash
# 특정 스코프로 설치
/plugin install proposal-specialist@proposal-specialist-marketplace --scope project
```

#### 팀/조직 배포

프로젝트의 `.claude/settings.json`에 아래 설정을 추가하면, 팀원이 Claude Code 실행 시 자동으로 플러그인 설치를 안내받습니다.

```json
{
  "permissions": {
    "additionalDirectories": []
  },
  "extraKnownMarketplaces": {
    "proposal-specialist-marketplace": {
      "source": {
        "source": "github",
        "repo": "ASTRA-TECHNOLOGY-COMPANY-LIMITED/proposal-specialist"
      }
    }
  },
  "enabledPlugins": {
    "proposal-specialist@proposal-specialist-marketplace": true
  }
}
```

### 방법 2: 소스에서 직접 설치

개발 또는 테스트 목적으로 소스 코드를 직접 클론하여 사용할 수 있습니다.

#### 1. 저장소 클론

```bash
git clone https://github.com/ASTRA-TECHNOLOGY-COMPANY-LIMITED/proposal-specialist.git
cd proposal-specialist
```

#### 2. MCP 서버 빌드

```bash
cd servers
npm install
npm run build
cd ..
```

빌드 결과물은 `servers/dist/index.js`에 생성됩니다.

#### 3. 플러그인 로드

Claude Code에서 `--plugin-dir` 옵션으로 플러그인을 로드합니다.

```bash
# 절대 경로로 지정
claude --plugin-dir /path/to/proposal-specialist

# 또는 플러그인 디렉토리에서 바로 실행
cd /path/to/proposal-specialist
claude --plugin-dir .
```

> 여러 플러그인을 동시에 로드하려면 `--plugin-dir`을 여러 번 사용할 수 있습니다:
> ```bash
> claude --plugin-dir ./plugin-1 --plugin-dir ./plugin-2
> ```

### 플러그인 관리

```bash
# 설치된 플러그인 목록 확인
/plugin list

# 플러그인 비활성화/활성화
/plugin disable proposal-specialist@proposal-specialist-marketplace
/plugin enable proposal-specialist@proposal-specialist-marketplace

# 플러그인 업데이트
/plugin update proposal-specialist@proposal-specialist-marketplace
/plugin update --all  # 모든 플러그인 업데이트

# 플러그인 제거
/plugin uninstall proposal-specialist@proposal-specialist-marketplace

# 디버그 모드 (플러그인 로딩 상세 정보 확인)
claude --debug
```

## API 키 설정

### 필수: 공공데이터포털 API 키

나라장터, K-스타트업, 중기부, 과기부 API는 모두 [공공데이터포털(data.go.kr)](https://www.data.go.kr)의 인증키를 사용합니다.

**발급 방법:**

1. https://www.data.go.kr 에 회원가입 및 로그인
2. 다음 API들에 대해 활용신청:
   - 나라장터 입찰공고 정보 (`getBidPblancListInfoServc`)
   - K-Startup 사업공고 (`getAnnouncementList`)
   - 중소벤처기업부 사업공고 (`mssBizService_v2`)
   - 과학기술정보통신부 사업공고 (`msitannouncementinfo`)
3. 발급받은 **일반 인증키(Encoding)** 를 환경 변수로 설정

**환경 변수 설정:**

```bash
# 셸 프로파일에 추가 (~/.zshrc, ~/.bashrc 등)
export DATA_GO_KR_API_KEY="발급받은_인증키"
```

### 선택: 기업마당 API 키

기업마당(BizInfo) 지원사업 검색을 사용하려면 별도 키가 필요합니다.

1. https://www.bizinfo.go.kr 에서 API 키 발급
2. 환경 변수 설정:

```bash
export BIZINFO_API_KEY="발급받은_인증키"
```

### 선택: NTIS API 키

NTIS 국가R&D 과제 검색을 사용하려면 별도 키가 필요합니다.

1. https://www.ntis.go.kr 에서 API 키 발급
2. 환경 변수 설정:

```bash
export NTIS_API_KEY="발급받은_인증키"
```

### 환경 변수 요약

| 환경 변수 | 필수 여부 | 용도 |
|-----------|----------|------|
| `DATA_GO_KR_API_KEY` | 필수 | 나라장터, K-스타트업, 중기부, 과기부 API 인증 |
| `COMPANY_DOCS_DIR` | 선택 | 기업 자료 디렉토리 경로 (명령어 경로 생략 가능) |
| `BIZINFO_API_KEY` | 선택 | 기업마당 지원사업 검색 |
| `NTIS_API_KEY` | 선택 | NTIS 국가R&D 과제 검색 |

### 환경 변수 검증

플러그인은 세션 시작 시 자동으로 환경 변수 설정 여부를 확인합니다. 누락된 항목이 있으면 경고 메시지가 표시되지만 세션은 정상적으로 시작됩니다.

## 기업 자료 설정

플러그인은 회사 소개서, 기술 사양서, 수행실적 등 다양한 형식의 기업 문서를 분석합니다.

### 기업 자료 디렉토리 (환경 변수)

`COMPANY_DOCS_DIR` 환경 변수에 기업 자료가 있는 디렉토리를 지정하면, 명령어 실행 시 매번 파일 경로를 입력하지 않아도 됩니다.

```bash
# 셸 프로파일에 추가 (~/.zshrc, ~/.bashrc 등)
export COMPANY_DOCS_DIR="/path/to/company-docs"
```

설정 후에는 경로 없이 바로 실행할 수 있습니다:

```bash
# COMPANY_DOCS_DIR 디렉토리의 자료를 자동으로 읽어 분석
/proposal-specialist:analyze-company

# 전체 워크플로우도 경로 생략 가능
/proposal-specialist:search-strategy
```

### 직접 파일 경로 전달

환경 변수 대신 명령어 인자로 파일 경로를 직접 전달할 수도 있습니다. 인자가 주어지면 `COMPANY_DOCS_DIR`보다 우선합니다.

```bash
# 단일 파일 분석
/proposal-specialist:analyze-company /path/to/company-intro.pdf

# 디렉토리 지정
/proposal-specialist:analyze-company /path/to/company-docs/

# 전체 워크플로우
/proposal-specialist:search-strategy /path/to/company-intro.pdf
```

**경로 우선순위:** 명령어 인자 > `COMPANY_DOCS_DIR` 환경 변수 > 현재 디렉토리

### 지원 파일 형식

- PDF (`.pdf`) - 회사 소개서, 기술 문서
- 텍스트 (`.txt`, `.md`) - 기업 정보 요약
- Office 문서 (`.docx`, `.xlsx`, `.pptx`) - 회사 자료
- 이미지 (`.png`, `.jpg`) - 인증서, 자격증 스캔본

### 자료 준비 팁

분석 정확도를 높이려면 다음 정보가 포함된 자료를 준비하세요:

- **기업 기본정보**: 업종, 설립일, 임직원 수, 매출 규모
- **기술 역량**: 보유 기술 스택, 개발 환경, 특허/저작권
- **인증 현황**: ISO, ISMS, CMMI, GS인증, 이노비즈 등
- **수행 실적**: 공공/민간 프로젝트 수행 이력, 금액, 기간
- **조직 구성**: 기술 인력 현황, 자격증 보유 현황

## 사용법

### 명령어

| 명령어 | 설명 | 사용 예시 |
|--------|------|-----------|
| `analyze-company` | 회사 문서를 분석하여 기업 프로파일과 검색 키워드 추출 | `/proposal-specialist:analyze-company` 또는 `/proposal-specialist:analyze-company ./회사소개서.pdf` |
| `search-bid` | 복수 플랫폼에서 매칭되는 공고 검색 | `/proposal-specialist:search-bid AI 솔루션` |
| `search-evaluate` | 특정 입찰공고의 상세 분석 및 수주 확률 평가 | `/proposal-specialist:search-evaluate 20260101001` |
| `search-strategy` | 전체 워크플로우 (분석→검색→평가→전략 수립) | `/proposal-specialist:search-strategy` 또는 `/proposal-specialist:search-strategy ./회사소개서.pdf` |
| `generate-toc` | RFP + 기업 시드 문서로 제안서 목차 생성 | `/proposal-specialist:generate-toc RFP.pdf seed.md` |
| `generate-section` | 생성된 목차 기반으로 제안서 섹션 작성 | `/proposal-specialist:generate-section 목차.md` |

### 전체 워크플로우 예시

```bash
# 1. Claude Code 실행 (플러그인 로드)
claude --plugin-dir /path/to/proposal-specialist

# 2. 전체 전략 워크플로우 실행 (COMPANY_DOCS_DIR 설정 시 경로 생략 가능)
/proposal-specialist:search-strategy
```

워크플로우는 다음 단계로 진행됩니다:

1. **기업 분석** - 회사 문서에서 역량, 기술, 실적을 추출
2. **사용자 확인** - 추출된 프로파일과 검색 키워드를 확인/수정
3. **공고 검색** - 6개 플랫폼에서 병렬 검색 후 적합도 순 정렬
4. **공고 선택** - 사용자가 상세 분석할 공고를 선택
5. **심층 평가** - RFP 다운로드, 100점 만점 평가, SWOT 분석
6. **최종 보고** - 수주 확률, 전략 방향, 제안서 목차 제시

### 제안서 작성 워크플로우

```bash
# 1. 제안서 목차 생성 (RFP + 기업 시드 문서)
/proposal-specialist:generate-toc data/business/사업명/제안요청서.pdf data/seed/회사명/시드.md

# 2. 섹션별 상세 내용 작성
/proposal-specialist:generate-section data/output/사업명/목차.md
```

## 디렉토리 구조

```
proposal-specialist/
├── .claude-plugin/
│   ├── plugin.json              # 플러그인 매니페스트
│   └── marketplace.json         # 마켓플레이스 설정
├── .mcp.json                    # MCP 서버 설정
├── CLAUDE.md                    # Claude Code 지침
├── commands/                    # 사용자 호출 명령어
│   ├── analyze-company.md
│   ├── search-bid.md
│   ├── search-evaluate.md
│   ├── search-strategy.md
│   ├── generate-toc.md
│   └── generate-section.md
├── skills/                      # 자동 적용 스킬
│   ├── company-profiler/
│   └── proposal-strategist/
├── agents/                      # 서브 에이전트
│   ├── doc-analyzer.md
│   ├── bid-searcher.md
│   ├── rfp-evaluator.md
│   ├── toc-generator.md
│   └── section-writer.md
├── hooks/hooks.json             # 세션 시작 훅
├── scripts/validate-env.sh      # 환경 변수 검증
├── data/                        # 평가 템플릿 및 프로젝트 데이터
│   ├── evaluation-templates.json
│   ├── seed/                    # 기업 시드 문서
│   ├── business/                # RFP 문서
│   └── output/                  # 생성된 제안서 (런타임)
├── servers/                     # MCP 서버 (TypeScript)
│   ├── src/
│   ├── dist/                    # 빌드 결과물
│   └── package.json
├── downloads/                   # 첨부파일 다운로드 경로
└── docs/                        # 설계 문서
```

## 문제 해결

### API 키 관련

```
"DATA_GO_KR_API_KEY 환경 변수가 설정되지 않았습니다"
```
→ 셸 프로파일에 `export DATA_GO_KR_API_KEY="..."` 를 추가한 후 터미널을 재시작하세요.

### MCP 서버 빌드 오류

```bash
# node_modules 재설치
cd servers && rm -rf node_modules && npm install && npm run build
```

### 플러그인 로딩 오류

```bash
# 디버그 모드로 상세 정보 확인
claude --debug

# 플러그인 에러 확인 (인터랙티브 UI의 Errors 탭)
/plugin
```

### 파일 다운로드 오류

다운로드 파일은 기본적으로 플러그인 루트의 `downloads/` 디렉토리에 저장됩니다. 디렉토리 쓰기 권한을 확인하세요.

## 라이선스

MIT
