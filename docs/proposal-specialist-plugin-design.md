# Proposal Specialist Plugin 설계 문서

> 기업 문서 기반 공공조달/지원사업 탐색 및 제안 전략 수립 Claude Code 플러그인

---

## 1. 개요

### 1.1 목적

기업의 소개서, 기술 문서 등을 분석하여 **나라장터**, **K-스타트업**, **기업마당** 등 공공 조달/지원사업 플랫폼에서 적합한 사업 기회를 탐색하고, 첨부파일까지 다운로드/분석하여 **제안 성공 가능성 평가** 및 **제안 방향 제시**까지 수행하는 Claude Code 플러그인을 개발한다.

### 1.2 해결하려는 문제

| 문제 | 현상 | 플러그인 해결 방식 |
|---|---|---|
| 키워드 도출 | 수동으로 기업 역량 분석 후 키워드 정리 | 기업 문서를 AI가 분석하여 자동 키워드 도출 |
| 공고 탐색 | 각 플랫폼에 직접 접속하여 수작업 검색 | 7개 API를 MCP Tool로 병렬 검색 |
| 적합성 판단 | 공고 제목만 보고 직감적 판단 | 기업 역량-공고 요구사항 매칭 스코어링 |
| 첨부파일 분석 | 제안요청서 PDF 수동 다운로드/분석 | MCP Tool로 자동 다운로드 + AI 분석 |
| 제안 전략 | 경험 기반 주관적 판단 | 데이터 기반 성공 가능성/제안 방향 제시 |

### 1.3 대상 사용자

- Claude Code를 사용하여 공공 조달 입찰에 참여하는 기업
- K-스타트업, 기업마당 등 지원사업을 탐색하는 스타트업/중소기업
- 제안서 작성 방향을 데이터 기반으로 수립하려는 영업/기획 담당자

---

## 2. 플러그인 아키텍처

### 2.1 디렉토리 구조

```
proposal-specialist/
├── .claude-plugin/
│   └── plugin.json                          # 플러그인 매니페스트
├── commands/
│   ├── analyze.md                           # /proposal-specialist:analyze
│   ├── search.md                            # /proposal-specialist:search
│   ├── evaluate.md                          # /proposal-specialist:evaluate
│   └── strategy.md                          # /proposal-specialist:strategy
├── skills/
│   ├── company-profiler/
│   │   ├── SKILL.md                         # 기업 프로파일링 스킬 (자동)
│   │   └── industry-codes.md                # 업종 분류 코드 참조 문서
│   └── proposal-strategist/
│       ├── SKILL.md                         # 제안 전략 수립 스킬 (자동)
│       └── evaluation-criteria.md           # 평가 기준 참조 문서
├── agents/
│   ├── doc-analyzer.md                      # 기업 문서 분석 에이전트
│   ├── bid-searcher.md                      # 공고 탐색 에이전트
│   └── rfp-evaluator.md                     # RFP 분석/평가 에이전트
├── hooks/
│   └── hooks.json                           # 훅 설정 (SessionStart)
├── scripts/
│   └── validate-env.sh                      # 환경 변수 검증 스크립트
├── servers/                                 # MCP 서버 (외부 API 접근)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                         # MCP 서버 엔트리포인트
│       ├── tools/
│       │   ├── g2b.ts                       # 나라장터 API Tools (5개)
│       │   ├── kstartup.ts                  # K-스타트업 API Tools (2개)
│       │   ├── government.ts                # 중기부/과기부 API Tools (2개)
│       │   └── file-manager.ts              # 파일 다운로드/관리 Tools (2개)
│       └── utils/
│           ├── api-client.ts                # 공공데이터포털 HTTP 클라이언트
│           └── date-utils.ts                # 날짜 변환 유틸리티
├── data/
│   └── evaluation-templates.json            # 평가 기준 템플릿
├── .mcp.json                                # MCP 서버 설정
├── CLAUDE.md                                # Claude Code 프로젝트 가이드
├── README.md
├── LICENSE
├── CHANGELOG.md
├── .gitignore
└── docs/
    ├── proposal-specialist-plugin-design.md  # 이 문서
    ├── mcp-server-spec.md                    # MCP 서버 상세 구현 스펙
    └── api-reference.md                      # 외부 API 레퍼런스
```

### 2.2 매니페스트 (plugin.json)

```json
{
  "name": "proposal-specialist",
  "version": "1.0.0",
  "description": "기업 문서 기반 공공조달/지원사업 탐색 및 제안 전략 수립 플러그인",
  "author": {
    "name": "Zeans",
    "email": "zeans@astravision.co.kr"
  },
  "license": "MIT",
  "keywords": [
    "proposal",
    "g2b",
    "procurement",
    "k-startup",
    "rfp",
    "bid",
    "korean-government"
  ]
}
```

### 2.3 standard-enforcer와의 구조 비교

| 구성 요소 | standard-enforcer | proposal-specialist | 차이 사유 |
|---|---|---|---|
| Skills | 3개 (자동 코드 작성 지원) | 2개 (자동 문서 분석/전략 지원) | 용도 상이 |
| Commands | 6개 (검사/조회/생성) | 4개 (분석/검색/평가/전략) | 용도 상이 |
| Agents | 2개 (검사 전문) | 3개 (분석/검색/평가 전문) | 워크플로우 단계별 분리 |
| Hooks | PostToolUse (Write/Edit 후) | SessionStart (세션 시작 시) | 검사 vs 환경 검증 |
| Scripts | 2개 (금칙어/네이밍 검사) | 1개 (환경 변수 검증) | API 키 검증만 필요 |
| Data | 6개 JSON (표준 사전, 국제 코드) | 1개 JSON (평가 템플릿) | 외부 데이터는 API로 조회 |
| MCP Server | 없음 | 1개 (procurement-api, 11 Tools) | **외부 API 호출 필요** |
| `.mcp.json` | 없음 | 있음 | MCP 서버 설정 |

> **핵심 차이**: standard-enforcer는 번들된 JSON 데이터만 참조하므로 외부 접속이 불필요하다. proposal-specialist는 공공데이터포털 API를 호출해야 하므로 MCP 서버가 필수적이다.

---

## 3. 컴포넌트 상세 설계

### 3.1 스킬 (Skills) - Claude 자동 호출

#### 3.1.1 company-profiler 스킬

**목적**: Claude가 기업 소개서나 기술 문서를 읽을 때 체계적인 기업 프로필을 **자동으로 구성**한다.

**파일**: `skills/company-profiler/SKILL.md`

```markdown
---
name: company-profiler
description: >
  기업 소개서나 기술 문서를 읽을 때 기업의 핵심 역량, 기술 스택,
  사업 영역을 자동으로 프로파일링합니다.
  기업 분석, 역량 파악, 회사 소개 시 사용합니다.
---

# 기업 프로파일링 스킬

기업 관련 문서를 분석할 때 반드시 아래 항목을 체계적으로 추출하라.
상세 업종 분류 코드는 이 디렉토리의 industry-codes.md를 참조하라.

## 적용 대상

아래 조건에 해당하는 파일을 읽을 때 자동 적용한다:

- 파일명에 `소개서`, `회사`, `기업`, `company`, `profile`, `intro`, `portfolio` 포함
- 내용에 사업 영역, 보유 기술, 주요 실적, 인력 현황 등 기업 역량 관련 정보 포함

## 추출 항목

### 1. 기업 기본 정보
- 회사명, 업종, 설립연도, 임직원 수
- 매출 규모, 주요 사업 영역
- 소재지 (지역 제한 사업 대비)

### 2. 핵심 기술/역량
- 보유 기술 스택 (프로그래밍 언어, 프레임워크, 솔루션)
- 특허, 인증, 자격 (ISO, 보안인증, SW품질인증, GS인증 등)
- 기술 차별화 포인트

### 3. 주요 실적
- 납품/수행 실적 (기관명, 사업명, 금액)
- 공공 사업 실적 유무 및 건수
- 유사 프로젝트 경험 분류

### 4. 인력 현황
- 전문 인력 수 (기술사, 기사, PMP, 정보보안기사 등)
- 핵심 보유 자격증 목록

### 5. 검색 키워드 도출
나라장터 공고명에서 실제 사용되는 용어를 반영하여 키워드를 도출하라:
- 기술 키워드: AI, 빅데이터, 클라우드, IoT, 블록체인 등 보유 기술 기반
- 업무 키워드: 시스템 구축, 운영, 유지보수, 컨설팅, 플랫폼 개발 등
- 산업 키워드: 스마트시티, 디지털트윈, 공공데이터, 전자정부 등
- 복합 키워드: "AI 기반 XX 시스템", "XX 플랫폼 구축" 등
```

**참조 문서**: `skills/company-profiler/industry-codes.md` — 나라장터 업종 분류 코드와 일반 산업 분류 매핑 테이블

#### 3.1.2 proposal-strategist 스킬

**목적**: Claude가 공공 조달 입찰이나 지원사업 관련 작업을 수행할 때 제안 전략 관점을 **자동으로 적용**한다.

**파일**: `skills/proposal-strategist/SKILL.md`

```markdown
---
name: proposal-strategist
description: >
  공공 조달 입찰이나 지원사업 신청에 대해 제안 전략을 수립합니다.
  제안서 작성 방향, 평가 항목별 대응 전략, 차별화 포인트를 제시합니다.
  제안서 작성, 입찰 전략, 사업 지원 신청 시 사용합니다.
---

# 제안 전략 수립 스킬

공공 조달/지원사업 제안과 관련된 작업을 수행할 때 반드시 아래를 고려하라.
상세 평가 기준 체계는 이 디렉토리의 evaluation-criteria.md를 참조하라.

## 적용 대상

아래 조건에 해당하는 작업 시 자동 적용한다:

- 입찰공고, 제안요청서(RFP), 과업지시서 분석
- 제안서 작성 또는 구조/목차 설계
- 지원사업 신청서 작성
- 입찰 참가 여부 검토

## 핵심 규칙

### 1. 평가 기준 분석
- 기술평가/가격평가 배점 비율을 반드시 파악하라
- 기술평가 세부 항목(사업이해도, 기술성, 수행체계, 유사실적 등)의 배점을 확인하라
- 고배점 항목에 집중하는 전략을 우선하라

### 2. 자격 요건 점검
- 참가 자격 요건(자본금, 면허, 인증, 실적)을 먼저 확인하라
- 충족하지 못하는 자격이 있으면 명확히 경고하라
- 컨소시엄 구성으로 보완 가능 여부를 검토하라

### 3. 차별화 전략
- 경쟁사 대비 강점을 중심으로 제안 방향을 수립하라
- 기술적 차별화 요소를 최소 3개 이상 도출하라
- 유사 실적을 정량적으로 제시하는 방안을 포함하라

### 4. 가격 전략
- 투찰율 기준: 예정가격의 85~95% 범위를 일반적으로 고려
- 기술 가중치가 높은 입찰은 품질 경쟁 전략을 우선
- 적격심사(최저가 입찰)인 경우 가격 경쟁력에 집중

### 5. 리스크 분석
- 탈락 위험 요소를 사전에 식별하라 (미충족 자격, 부족 실적)
- 수행 리스크(일정, 인력, 기술 난이도)를 평가하라
- 리스크별 대응 방안을 포함하라
```

**참조 문서**: `skills/proposal-strategist/evaluation-criteria.md` — 공공 조달 평가 기준 체계, 적격심사/기술평가 배점 기준 가이드

---

### 3.2 커맨드 (Commands) - 사용자 수동 호출

#### 3.2.1 /proposal-specialist:analyze

**목적**: 기업 소개서, 기술 문서를 분석하여 기업 프로필과 검색 키워드를 도출한다.

**파일**: `commands/analyze.md`

```markdown
---
description: 기업 소개서, 기술 문서를 분석하여 핵심 역량과 검색 키워드를 도출합니다
---

# 기업 문서 분석

$ARGUMENTS 에 지정된 기업 문서를 분석하라. 인자가 없으면 현재 디렉토리에서
기업 소개서나 기술 문서를 찾아라.

## 분석 절차

1. 지정된 파일 또는 디렉토리에서 기업 관련 문서를 Read Tool로 읽는다
2. doc-analyzer 에이전트를 호출하여 심층 분석을 수행한다
3. 결과를 정리하여 보고한다

## 출력 형식

### 기업 프로필

| 항목 | 내용 |
|---|---|
| 업종 | {업종 분류} |
| 핵심 분야 | {1-3개 핵심 사업 영역} |
| 규모 | {매출/인력 기준} |
| 보유 기술 | {주요 기술 목록} |
| 인증/자격 | {인증 및 자격 목록} |
| 주요 실적 | {공공/민간 실적 요약} |

### 검색 키워드 (우선순위순)

| # | 우선순위 | 키워드 | 도출 근거 |
|---|---|---|---|
| 1 | 높음 | {키워드} | {사유} |
| 2 | 높음 | {키워드} | {사유} |
| ... | 중간 | {키워드} | {사유} |

### 적합 사업 유형

- 나라장터 용역: {적합 여부 및 사유}
- 나라장터 물품: {적합 여부 및 사유}
- K-스타트업: {적합 여부 및 사유}
- R&D 과제: {적합 여부 및 사유}
- 중기부 지원사업: {적합 여부 및 사유}
```

#### 3.2.2 /proposal-specialist:search

**목적**: 키워드 기반으로 나라장터, K-스타트업 등에서 관련 공고를 통합 검색한다.

**파일**: `commands/search.md`

```markdown
---
description: 키워드 기반으로 나라장터, K-스타트업 등에서 관련 공고를 통합 검색합니다
---

# 공고 통합 검색

$ARGUMENTS 에 지정된 키워드로 공공 조달/지원사업 공고를 검색하라.
인자가 없으면 이전 analyze 결과의 키워드를 사용하라.

## 검색 절차

1. 사용자 입력 또는 이전 분석 결과에서 키워드를 확보한다
2. bid-searcher 에이전트를 호출하여 병렬 검색을 위임한다
3. 결과를 통합하여 적합도 순으로 정렬한다

## 검색 대상 플랫폼

MCP Tool을 사용하여 다음 플랫폼을 병렬 검색하라:

| MCP Tool | 플랫폼 | 용도 |
|---|---|---|
| `g2b_search_bids` (category: servc) | 나라장터 | 용역 입찰공고 |
| `g2b_search_bids` (category: thng) | 나라장터 | 물품 입찰공고 |
| `g2b_search_pre_specs` | 나라장터 | 사전규격 (향후 공고 예정) |
| `kstartup_search_announcements` | K-스타트업 | 지원사업 공고 |
| `mss_search_announcements` | 중소벤처기업부 | 사업공고 |
| `msit_search_announcements` | 과학기술정보통신부 | 사업공고 |

## 출력 형식

마감일이 임박한 순서로 정렬하고, 각 공고에 대해:
- 공고명, 기관명, 마감일, 추정가격
- 적합도 표시 (높음/중간/낮음)
- 출처 플랫폼
- 첨부파일 유무
```

#### 3.2.3 /proposal-specialist:evaluate

**목적**: 특정 공고에 대해 상세 분석하고 제안 성공 가능성을 평가한다.

**파일**: `commands/evaluate.md`

```markdown
---
description: 특정 공고에 대해 상세 분석하고 제안 성공 가능성을 평가합니다
---

# 제안 적합성 평가

$ARGUMENTS 에 지정된 공고에 대해 상세 분석하고 제안 전략을 수립하라.
입찰공고번호, 공고 URL, 또는 이전 검색 결과에서 선택한 공고를 대상으로 한다.

## 평가 절차

1. MCP Tool로 공고 상세 정보를 조회한다 (g2b_get_bid_detail 등)
2. 첨부파일을 다운로드한다 (download_attachment Tool)
3. rfp-evaluator 에이전트를 호출하여 상세 분석을 위임한다
4. 평가 보고서를 작성한다

## 평가 항목

| 항목 | 배점 | 평가 기준 |
|---|---|---|
| 자격 요건 충족 | 20점 | 참가 자격, 면허, 인증 |
| 기술 역량 매칭 | 30점 | 요구 기술과 보유 기술 일치도 |
| 유사 실적 | 25점 | 관련 프로젝트 경험 |
| 가격 경쟁력 | 15점 | 추정가격 대비 적정성 |
| 일정 적합성 | 10점 | 준비 기간, 수행 기간 |

## 출력 형식

### 성공 가능성 평가: {점수}/100

| 평가 항목 | 점수 | 근거 |
|---|---|---|
| 자격 요건 | {}/20 | {상세} |
| 기술 역량 | {}/30 | {상세} |
| 유사 실적 | {}/25 | {상세} |
| 가격 경쟁력 | {}/15 | {상세} |
| 일정 적합성 | {}/10 | {상세} |

### SWOT 분석
- **강점(S)**: {기업이 이 공고에서 유리한 점}
- **약점(W)**: {보완이 필요한 부분}
- **기회(O)**: {활용 가능한 외부 요인}
- **위협(T)**: {주의해야 할 리스크}

### 제안 방향 (5개 항목)

### 준비 체크리스트
```

#### 3.2.4 /proposal-specialist:strategy

**목적**: 기업 문서 분석부터 제안 전략 수립까지 전체 프로세스를 실행한다.

**파일**: `commands/strategy.md`

```markdown
---
description: 기업 문서 분석부터 제안 전략 수립까지 전체 프로세스를 실행합니다
---

# 제안 전략 수립 (전체 워크플로우)

기업 문서를 기반으로 공고 탐색부터 제안 전략 수립까지 전체 과정을 수행하라.

## 실행 순서

### Step 1: 기업 문서 분석
$ARGUMENTS 에 지정된 기업 문서를 doc-analyzer 에이전트로 분석하라.
- 기업 프로필 생성
- 검색 키워드 도출 (10~15개)
- 적합 사업 유형 결정

### Step 2: 사용자 확인
도출된 키워드와 기업 프로필을 보여주고 수정/보완 의견을 받아라.
"다음 키워드로 검색하겠습니다. 수정하거나 추가할 키워드가 있나요?"

### Step 3: 공고 탐색
확정된 키워드로 bid-searcher 에이전트를 통해 병렬 검색하라.
MCP Tools 활용: g2b_search_bids, kstartup_search_announcements 등

### Step 4: 공고 선택
검색 결과를 적합도 순으로 보여주고 사용자가 상세 분석할 공고를 선택하게 하라.
"총 {N}건의 관련 공고를 찾았습니다. 상세 분석할 공고를 선택하세요."

### Step 5: 상세 평가
선택된 공고에 대해 rfp-evaluator 에이전트로 상세 분석하라.
- download_attachment Tool로 첨부파일 다운로드
- 제안요청서/규격서 분석
- 성공 가능성 평가
- 제안 방향 수립

### Step 6: 최종 보고서
전체 분석 결과를 종합하여 제안 전략 보고서를 작성하라.
- 기업 프로필 요약
- 추천 공고 목록 (적합도순)
- 선택 공고 상세 평가
- 제안 방향 및 전략
- 준비 체크리스트
```

---

### 3.3 서브에이전트 (Agents)

#### 3.3.1 doc-analyzer 에이전트

**목적**: 기업 문서를 심층 분석하여 프로필과 키워드를 도출하는 전문 에이전트.

**파일**: `agents/doc-analyzer.md`

```markdown
---
name: doc-analyzer
description: >
  기업 소개서, 기술 문서를 분석하여 기업 프로필을 생성하고
  공고 검색에 적합한 키워드를 도출합니다.
  기업 문서 분석, 역량 파악, 키워드 추출 시 사용합니다.
---

당신은 공공 조달 전문 컨설턴트입니다.
기업의 문서를 분석하여 조달/지원사업 검색에 최적화된 프로필을 생성합니다.

## 분석 항목

### 1. 기본 정보 추출
- 회사명, 업종, 설립연도, 임직원 수
- 매출 규모, 주요 사업 영역
- 소재지 (지역 제한 사업 대비)

### 2. 핵심 기술/역량 추출
- 보유 기술 스택
- 특허, 인증, 자격 (ISO, 보안인증, SW품질인증, GS인증 등)
- 기술 차별화 포인트

### 3. 실적 분석
- 납품/수행 실적 (기관명, 사업명, 금액)
- 공공 사업 실적 유무 및 건수
- 유사 프로젝트 경험 분류

### 4. 인력 현황
- 전문 인력 수 (기술사, 기사, PMP, 박사 등)
- 핵심 보유 자격증 목록

### 5. 검색 키워드 도출
나라장터 공고명에서 실제로 사용되는 용어를 반영하라:
- 기술 키워드: AI, 빅데이터, 클라우드, IoT 등 보유 기술 기반
- 업무 키워드: 시스템 구축, 운영, 유지보수, 컨설팅 등
- 산업 키워드: 스마트시티, 디지털트윈, 공공데이터 등
- 복합 키워드: "AI 기반 XX 시스템", "XX 플랫폼 구축" 등

## 출력 구조

```
## 기업 프로필

### 기본 정보
- 업종: {업종}
- 규모: {매출/인력 규모}
- 핵심 분야: {1-3개 핵심 분야}

### 보유 역량
- 기술: {기술 목록}
- 인증: {인증 목록}
- 실적: {주요 실적 요약}

### 검색 키워드 (우선순위순)
1. [높음] {키워드} - {도출 근거}
2. [높음] {키워드} - {도출 근거}
3. [중간] {키워드} - {도출 근거}
...

### 적합 사업 유형
- 나라장터 용역: {적합 여부 및 사유}
- 나라장터 물품: {적합 여부 및 사유}
- K-스타트업: {적합 여부 및 사유}
- R&D 과제: {적합 여부 및 사유}
- 중기부 지원사업: {적합 여부 및 사유}
```
```

#### 3.3.2 bid-searcher 에이전트

**목적**: 다양한 플랫폼의 MCP Tool을 활용하여 관련 공고를 병렬 검색하고 결과를 통합하는 전문 에이전트.

**파일**: `agents/bid-searcher.md`

```markdown
---
name: bid-searcher
description: >
  나라장터, K-스타트업, 기업마당 등 공공 플랫폼에서 키워드 기반으로
  입찰공고/지원사업을 병렬 탐색하고 결과를 통합합니다.
  공고 검색, 사업 기회 탐색, 조달 정보 조회 시 사용합니다.
---

당신은 공공 조달/지원사업 탐색 전문 에이전트입니다.
다양한 플랫폼의 MCP Tool을 활용하여 관련 공고를 병렬로 검색합니다.

## 검색 전략

### 1. 키워드 분석
주어진 키워드 목록에서 검색 전략을 수립하라:
- 우선순위가 높은 키워드부터 검색
- 너무 넓은 키워드는 세분화
- 너무 좁은 키워드는 상위 개념으로 확장

### 2. 플랫폼별 검색 (병렬 실행)
다음 MCP Tool을 활용하여 병렬 검색하라:

**나라장터:**
- `g2b_search_bids` (category: servc) - 용역 공고
- `g2b_search_bids` (category: thng) - 물품 공고
- `g2b_search_pre_specs` - 사전규격 (향후 공고 예정)

**지원사업:**
- `kstartup_search_announcements` - K-스타트업
- `mss_search_announcements` - 중소벤처기업부
- `msit_search_announcements` - 과학기술정보통신부

### 3. 결과 통합
- 중복 공고 제거 (공고번호 기준)
- 1차 적합도 스코어링 (키워드 매칭 기반)
- 마감일 기준 정렬

### 4. 적합도 스코어링 기준

| 기준 | 가중치 | 설명 |
|---|---|---|
| 키워드 매칭도 | 40% | 공고명/내용에 핵심 키워드 포함 여부 |
| 사업 규모 적합성 | 20% | 기업 규모 대비 사업 예산 적합도 |
| 마감일 여유 | 15% | 준비 시간 충분 여부 (최소 2주) |
| 사업 유형 적합성 | 15% | 기업 업종과 사업 분류 일치도 |
| 발주기관 특성 | 10% | 기존 실적 있는 기관 우대 |

## 출력 형식

```
## 검색 결과 요약

- 총 검색 결과: {N}건
- 플랫폼별: 나라장터 {n}건, K-스타트업 {n}건, ...
- 적합도 높음: {n}건, 중간: {n}건, 낮음: {n}건

## 추천 공고 (적합도순)

### 1. [높음] {공고명}
- 기관: {발주기관}
- 예산: {금액}
- 마감: {마감일} (D-{남은일수})
- 출처: {플랫폼}
- 매칭 키워드: {매칭된 키워드들}
- 첨부파일: {있음/없음}

### 2. ...
```
```

#### 3.3.3 rfp-evaluator 에이전트

**목적**: 공고 상세 정보와 첨부파일(제안요청서, 규격서)을 분석하여 제안 성공 가능성을 평가하고 제안 방향을 제시하는 전문 에이전트.

**파일**: `agents/rfp-evaluator.md`

```markdown
---
name: rfp-evaluator
description: >
  공고 상세 정보와 첨부파일(제안요청서, 규격서)을 분석하여
  제안 성공 가능성을 평가하고 제안 방향을 제시합니다.
  RFP 분석, 제안 전략 수립, 적합성 평가 시 사용합니다.
---

당신은 공공 조달 제안 전략 전문가입니다.
공고 상세 정보와 첨부 문서를 분석하여 제안 성공 가능성을 평가하고
구체적인 제안 방향을 제시합니다.

## 분석 프로세스

### 1. 공고 상세 분석
MCP Tool로 조회한 공고 상세 정보에서 추출:
- 사업 목적 및 범위
- 참가 자격 요건 (자본금, 실적, 인증 등)
- 수행 기간
- 추정 가격
- 입찰 방식 (제한/일반/협상)
- 평가 방식 (적격심사/기술평가 비율)

### 2. 첨부파일 분석
다운로드된 제안요청서/규격서에서 추출:
- 상세 요구사항 목록
- 기술 평가 항목 및 배점
- 필수/선택 요구 기능
- 납품/산출물 목록
- 투입 인력 요건

### 3. 기업 역량 매칭

| 평가 항목 | 배점 | 매칭 기준 |
|---|---|---|
| 자격 요건 충족 | 20 | 참가 자격, 면허, 인증 충족 여부 |
| 기술 역량 매칭 | 30 | 요구 기술과 보유 기술 일치도 |
| 유사 실적 | 25 | 관련 프로젝트 수행 경험 |
| 가격 경쟁력 | 15 | 추정가격 대비 원가 적정성 |
| 일정 적합성 | 10 | 준비기간 및 수행기간 적합성 |

### 4. SWOT 분석
- Strengths: 이 공고에서 기업이 유리한 점
- Weaknesses: 보완이 필요한 부분
- Opportunities: 활용 가능한 외부 요인
- Threats: 주의해야 할 리스크

### 5. 제안 방향 수립
- 핵심 차별화 전략
- 기술 제안 방향 (강조 영역)
- 실적 활용 전략 (레퍼런스 제시)
- 가격 전략 (투찰율 기준)
- 보완 사항 (부족한 역량 대응)

## 출력 형식

```
## 제안 적합성 평가 보고서

### 대상 공고
- 공고명: {공고명}
- 공고기관: {기관명}
- 추정가격: {금액}
- 입찰마감: {마감일}
- 평가방식: {기술:가격 비율}

### 성공 가능성: {점수}/100점

| 평가 항목 | 점수 | 근거 |
|---|---|---|
| 자격 요건 | {}/20 | {상세} |
| 기술 역량 | {}/30 | {상세} |
| 유사 실적 | {}/25 | {상세} |
| 가격 경쟁력 | {}/15 | {상세} |
| 일정 적합성 | {}/10 | {상세} |

### SWOT 분석
**강점(S)**: ...
**약점(W)**: ...
**기회(O)**: ...
**위협(T)**: ...

### 제안 방향
1. **핵심 전략**: {차별화 포인트}
2. **기술 제안**: {강조 영역}
3. **실적 활용**: {레퍼런스 활용}
4. **가격 전략**: {투찰 방향}
5. **보완 사항**: {준비 필요 항목}

### 준비 체크리스트
- [ ] {필수 확인/준비 항목 1}
- [ ] {필수 확인/준비 항목 2}
- [ ] ...
```
```

---

### 3.4 훅 (Hooks)

#### 3.4.1 hooks.json

**목적**: 세션 시작 시 API 키 환경 변수의 설정 여부를 자동으로 검증한다.

**파일**: `hooks/hooks.json`

```json
{
  "description": "Proposal Specialist 환경 검증 훅",
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/validate-env.sh",
            "timeout": 10,
            "statusMessage": "API 키 검증 중..."
          }
        ]
      }
    ]
  }
}
```

#### 3.4.2 환경 변수 검증 스크립트

**파일**: `scripts/validate-env.sh`

**동작**:
1. 세션 시작 시 자동 실행 (SessionStart 훅)
2. 필수/선택 환경 변수의 설정 여부를 확인한다
3. 미설정 항목을 경고 메시지로 출력한다
4. 항상 exit 0 (비블로킹)

```bash
#!/bin/bash
# validate-env.sh
# SessionStart 훅: API 키 환경 변수 설정 여부를 검증한다.
# 비블로킹(exit 0) — 경고만 제공하고 세션 시작을 중단하지 않는다.

WARNINGS=""

# 필수: 공공데이터포털 API 키
if [ -z "$DATA_GO_KR_API_KEY" ]; then
  WARNINGS="${WARNINGS}[필수] DATA_GO_KR_API_KEY가 설정되지 않았습니다. 나라장터/K-스타트업 등 API를 사용하려면 data.go.kr에서 API 키를 발급받아 환경 변수를 설정하세요.\n"
fi

# 선택: 기업마당 API 키
if [ -z "$BIZINFO_API_KEY" ]; then
  WARNINGS="${WARNINGS}[선택] BIZINFO_API_KEY가 설정되지 않았습니다. 기업마당 API를 사용하려면 bizinfo.go.kr에서 API 키를 발급받으세요.\n"
fi

# 선택: NTIS API 키
if [ -z "$NTIS_API_KEY" ]; then
  WARNINGS="${WARNINGS}[선택] NTIS_API_KEY가 설정되지 않았습니다. NTIS R&D 과제 검색을 사용하려면 ntis.go.kr에서 API 키를 발급받으세요.\n"
fi

if [ -n "$WARNINGS" ]; then
  echo -e "[proposal-specialist] 환경 변수 검증 결과:"
  echo -e "$WARNINGS"
fi

exit 0
```

---

## 4. MCP 서버 설계 (procurement-api)

> standard-enforcer에는 없는 컴포넌트. proposal-specialist는 공공데이터포털 등 외부 API를 호출해야 하므로 MCP 서버를 통해 구조화된 Tool로 제공한다.

### 4.1 개요

| 항목 | 값 |
|---|---|
| 서버 이름 | procurement-api |
| 기술 스택 | Node.js (>=18) + TypeScript |
| SDK | `@modelcontextprotocol/sdk` v1.x |
| Transport | stdio (Claude Code 플러그인 기본) |
| HTTP 클라이언트 | 내장 `fetch` API |

### 4.2 .mcp.json 설정

```json
{
  "mcpServers": {
    "procurement-api": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/dist/index.js"],
      "env": {
        "DATA_GO_KR_API_KEY": "${DATA_GO_KR_API_KEY}",
        "BIZINFO_API_KEY": "${BIZINFO_API_KEY}",
        "NTIS_API_KEY": "${NTIS_API_KEY}",
        "DOWNLOAD_DIR": "${CLAUDE_PLUGIN_ROOT}/downloads"
      }
    }
  }
}
```

### 4.3 Tool 설계

| # | Tool 이름 | 설명 | API 소스 |
|---|---|---|---|
| 1 | `g2b_search_bids` | 나라장터 입찰공고 검색 | 조달청 입찰공고정보서비스 |
| 2 | `g2b_get_bid_detail` | 입찰공고 상세 조회 | 조달청 입찰공고정보서비스 |
| 3 | `g2b_search_pre_specs` | 사전규격 검색 | 조달청 사전규격정보서비스 |
| 4 | `g2b_search_awards` | 낙찰 정보 검색 | 조달청 낙찰정보서비스 |
| 5 | `g2b_get_contract_process` | 계약과정 통합 조회 | 조달청 계약과정통합공개서비스 |
| 6 | `kstartup_search_announcements` | K-스타트업 공고 검색 | 창업진흥원 K-Startup 서비스 |
| 7 | `kstartup_search_programs` | K-스타트업 사업 정보 | 창업진흥원 K-Startup 서비스 |
| 8 | `mss_search_announcements` | 중소벤처기업부 공고 검색 | 중소벤처기업부 사업공고 |
| 9 | `msit_search_announcements` | 과기부 사업공고 검색 | 과학기술정보통신부 사업공고 |
| 10 | `download_attachment` | 첨부파일 다운로드 | - |
| 11 | `list_downloads` | 다운로드 파일 목록 | - |

> 상세 구현 코드는 `docs/mcp-server-spec.md` 참조

### 4.4 환경 변수

| 환경 변수 | 필수 | 설명 | 발급처 |
|---|---|---|---|
| `DATA_GO_KR_API_KEY` | 필수 | 공공데이터포털 API 키 | [data.go.kr](https://data.go.kr) |
| `BIZINFO_API_KEY` | 선택 | 기업마당 API 키 | [bizinfo.go.kr](https://www.bizinfo.go.kr) |
| `NTIS_API_KEY` | 선택 | NTIS API 키 | [ntis.go.kr](https://www.ntis.go.kr) |

> `DATA_GO_KR_API_KEY` 하나로 나라장터, K-스타트업, 중소벤처기업부, 과기부 API를 모두 사용할 수 있다.

> API 엔드포인트, 파라미터, 응답 필드 상세는 `docs/api-reference.md` 참조

---

## 5. 데이터 번들링

### 5.1 포함 데이터

| 파일 | 용도 |
|---|---|
| `data/evaluation-templates.json` | 공공 조달 평가 기준 템플릿 (적격심사, 기술평가 배점 체계) |

### 5.2 standard-enforcer와의 비교

| 항목 | standard-enforcer | proposal-specialist |
|---|---|---|
| 데이터 크기 | ~15MB (6개 JSON, 17,000+ 레코드) | 최소 (~수 KB) |
| 데이터 성격 | 정적 사전 데이터 (연 1-2회 갱신) | 평가 기준 템플릿 |
| 데이터 활용 | Claude가 직접 JSON 검색 | 스킬/에이전트의 참조 기준 |
| 실시간 데이터 | 불필요 | **MCP 서버를 통해 API로 조회** |

> 핵심 차이: standard-enforcer는 표준 용어 사전 JSON을 번들링하여 오프라인으로 동작한다. proposal-specialist는 실시간 공고 데이터가 필요하므로 MCP 서버를 통해 외부 API에서 조회한다.

### 5.3 참조 문서 (Skills 디렉토리)

| 파일 | 소속 스킬 | 용도 |
|---|---|---|
| `skills/company-profiler/industry-codes.md` | company-profiler | 나라장터 업종 분류 코드 매핑 |
| `skills/proposal-strategist/evaluation-criteria.md` | proposal-strategist | 공공 조달 평가 기준 체계 |

Claude가 스킬 활성화 시 SKILL.md에서 핵심 요약을 참조하고, 세부 규칙이 필요할 때 같은 디렉토리의 참조 문서를 읽는다 (standard-enforcer의 coding-convention 스킬과 동일한 패턴).

---

## 6. 컴포넌트 상호작용

### 6.1 자동 흐름 (Skills)

```
[기업 문서를 다루는 작업 시작]
        │
        ├─→ company-profiler 스킬 (자동)
        │   └─ 기업 역량, 기술 스택, 실적을 체계적으로 추출
        │
        └─→ proposal-strategist 스킬 (자동, 입찰/제안 관련 시)
            └─ 평가 기준 분석, 차별화 전략, 리스크 점검
```

### 6.2 수동 흐름 (Commands + Agents + MCP Tools)

```
[사용자가 커맨드 호출]
        │
        ├─→ /proposal-specialist:analyze
        │   └─→ doc-analyzer 에이전트
        │       └─ Read, Glob, Grep 도구로 문서 분석
        │
        ├─→ /proposal-specialist:search
        │   └─→ bid-searcher 에이전트
        │       └─ MCP Tools (g2b_search_bids, kstartup_search 등)로 병렬 검색
        │
        ├─→ /proposal-specialist:evaluate
        │   └─→ rfp-evaluator 에이전트
        │       ├─ MCP Tools (g2b_get_bid_detail, download_attachment)로 상세 조회
        │       └─ Read Tool로 다운로드된 첨부파일 분석
        │
        └─→ /proposal-specialist:strategy
            └─→ analyze → search → evaluate 순차 실행 (사용자 확인 포함)
```

### 6.3 전체 데이터 흐름

```
[기업 문서] → doc-analyzer → [기업 프로필 + 검색 키워드]
                                        │
                                        ▼
                              bid-searcher (병렬)
                           ┌──────┼──────┼──────┐
                           ▼      ▼      ▼      ▼
                         G2B  K-Startup  MSS   MSIT  (MCP Tools)
                           │      │      │      │
                           └──────┼──────┼──────┘
                                  ▼
                         [검색 결과 통합 + 스코어링]
                                  │
                                  ▼
                         rfp-evaluator
                           │
                           ├─ 첨부파일 다운로드 (MCP Tool)
                           ├─ 첨부파일 분석 (Read Tool)
                           ├─ 기업 역량 매칭
                           └─ SWOT 분석 + 제안 방향
                                  │
                                  ▼
                         [최종 보고서]
```

---

## 7. 핵심 설계 결정

### 7.1 Skills vs Commands 분리 기준

| 컴포넌트 | 호출 방식 | 이유 |
|---|---|---|
| company-profiler (스킬) | Claude 자동 | 기업 문서를 다룰 때 매번 자동으로 프로파일링해야 하므로 |
| proposal-strategist (스킬) | Claude 자동 | 입찰/제안 관련 작업 시 자동으로 전략 관점을 적용해야 하므로 |
| analyze (커맨드) | 사용자 수동 | 기업 문서 분석은 명시적 요청이 필요한 작업이므로 |
| search (커맨드) | 사용자 수동 | 공고 검색은 API 호출이 수반되며 의도적 행위이므로 |
| evaluate (커맨드) | 사용자 수동 | 특정 공고 평가는 공고 선택이 필요한 의도적 행위이므로 |
| strategy (커맨드) | 사용자 수동 | 전체 워크플로우 실행은 사용자 의도에 따라야 하므로 |

### 7.2 MCP 서버 채택 이유 (standard-enforcer와의 차이)

standard-enforcer는 번들된 JSON 데이터를 Claude가 직접 읽으므로 MCP 서버가 불필요하다. proposal-specialist는 다음 이유로 MCP 서버를 채택한다:

| 이유 | 설명 |
|---|---|
| 외부 API 호출 | 7개 공공데이터포털 API에 HTTP 요청이 필요하다 |
| 인증 관리 | serviceKey 주입, API별 인증 파라미터 차이 처리 |
| 날짜 변환 | YYYY-MM-DD → yyyyMMddHHmm 형식 변환 로직 |
| 응답 정규화 | API별로 다른 응답 구조를 통일된 형식으로 변환 |
| 에러 처리 | Rate limiting, 네트워크 에러, 인증 에러의 체계적 처리 |
| 파일 다운로드 | 바이너리 파일 다운로드 및 경로 순회 공격 방지 |
| Tool 스키마 | Claude가 각 Tool의 파라미터를 정확히 인식 (Zod 스키마) |

### 7.3 훅의 비블로킹 설계

SessionStart 훅은 **비블로킹**으로 동작한다 (exit 0). 이유:

- API 키 미설정은 **정보 제공** 목적이다 (일부 기능만 제한)
- 세션 시작을 차단하면 사용자 경험이 저하된다
- 필수 키 없이도 analyze/evaluate 등 로컬 문서 분석 기능은 동작한다
- 경고 메시지는 Claude의 컨텍스트에 추가되어 후속 작업에 반영된다

### 7.4 참조 문서 포함 방식

스킬별 참조 문서를 `skills/{skill-name}/` 디렉토리에 포함한다 (standard-enforcer와 동일한 패턴):

- `SKILL.md`에는 핵심 규칙 요약만 작성하여 토큰 효율성을 확보한다
- 같은 디렉토리에 상세 참조 문서를 배치하여 필요시 Claude가 읽는다
- `industry-codes.md`: 업종 분류 코드 (company-profiler 참조)
- `evaluation-criteria.md`: 평가 기준 체계 (proposal-strategist 참조)

---

## 8. 테스트 계획

### 8.1 단위 테스트

| 테스트 항목 | 검증 방법 |
|---|---|
| SessionStart 훅 | API 키 미설정 시 경고 메시지 출력 확인 |
| MCP Tool 호출 | 나라장터 API 응답 수신 및 정규화 확인 |
| 파일 다운로드 | 첨부파일 다운로드 및 경로 순회 방지 확인 |
| 에이전트 출력 형식 | 각 에이전트의 출력이 정의된 형식과 일치하는지 확인 |
| 스킬 자동 활성화 | 기업 문서 읽기 시 company-profiler 스킬 활성화 확인 |

### 8.2 통합 테스트

```bash
# 1. MCP 서버 빌드
cd servers && npm install && npm run build

# 2. 플러그인 로컬 테스트
claude --plugin-dir ./proposal-specialist

# 3. 커맨드 테스트
/proposal-specialist:analyze ./test-docs/company-intro.pdf
/proposal-specialist:search AI 솔루션
/proposal-specialist:evaluate 20260101001
/proposal-specialist:strategy ./test-docs/company-intro.pdf

# 4. API 직접 테스트
curl "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc?serviceKey=${DATA_GO_KR_API_KEY}&pageNo=1&numOfRows=5&inqryDiv=1&inqryBgnDt=202601010000&inqryEndDt=202602140000&type=json"

# 5. 디버그 모드
claude --debug --plugin-dir ./proposal-specialist
```

### 8.3 엣지 케이스

| 케이스 | 예상 동작 |
|---|---|
| API 키 미설정 | 경고 후 로컬 분석 기능만 제공 |
| API 응답 없음 (0건) | 빈 결과 반환, 키워드 확장 제안 |
| 대용량 첨부파일 (100MB+) | 파일 크기 제한 경고, 다운로드 거부 |
| HWP 파일 | 내용 추출 불가 안내, PDF/DOCX 전환 제안 |
| 마감 임박 공고 | D-day 경고 표시, 준비 가능 여부 판단 |
| 기업 문서 없음 | 수동 키워드 입력 안내 |

---

## 9. 배포 계획

### 9.1 로컬 배포 (1단계)

```bash
# MCP 서버 빌드 후 로컬에서 직접 사용
cd servers && npm install && npm run build
claude --plugin-dir /path/to/proposal-specialist
```

### 9.2 프로젝트 설정 배포 (2단계)

프로젝트의 `.claude/settings.json`에 등록하여 팀원 자동 설치:

```json
{
  "extraKnownMarketplaces": {
    "company-tools": {
      "source": {
        "source": "github",
        "repo": "team/claude-plugins"
      }
    }
  },
  "enabledPlugins": {
    "proposal-specialist@company-tools": true
  }
}
```

### 9.3 마켓플레이스 배포 (3단계)

GitHub 저장소로 공개하여 커뮤니티에서 사용 가능하게 한다.

---

## 10. 구현 우선순위

### Phase 1: 핵심 기능 (MVP)

| 순서 | 작업 | 설명 |
|---|---|---|
| 1 | 플러그인 기본 구조 | `.claude-plugin/plugin.json`, 디렉토리 구조, CLAUDE.md |
| 2 | MCP 서버 기본 설정 | `package.json`, `tsconfig.json`, `index.ts`, `.mcp.json` |
| 3 | 나라장터 입찰공고 Tools | `g2b_search_bids`, `g2b_get_bid_detail` |
| 4 | 파일 다운로드 Tool | `download_attachment`, `list_downloads` |
| 5 | doc-analyzer 에이전트 | 기업 문서 분석 |
| 6 | analyze 커맨드 | 기업 문서 분석 커맨드 |
| 7 | search 커맨드 | 나라장터 검색 커맨드 |
| 8 | evaluate 커맨드 | 적합성 평가 커맨드 |

### Phase 2: 다중 플랫폼 확장

| 순서 | 작업 | 설명 |
|---|---|---|
| 9 | K-스타트업 Tools | `kstartup_search_announcements`, `kstartup_search_programs` |
| 10 | 중기부/과기부 Tools | `mss_search_announcements`, `msit_search_announcements` |
| 11 | 나라장터 사전규격/낙찰 Tools | `g2b_search_pre_specs`, `g2b_search_awards`, `g2b_get_contract_process` |
| 12 | bid-searcher 에이전트 | 다중 플랫폼 병렬 검색 |
| 13 | rfp-evaluator 에이전트 | 제안 평가 고도화 |

### Phase 3: 고도화

| 순서 | 작업 | 설명 |
|---|---|---|
| 14 | strategy 커맨드 | 전체 워크플로우 통합 |
| 15 | Skills (2개) | company-profiler, proposal-strategist |
| 16 | Hooks | SessionStart 환경 검증 |
| 17 | 참조 데이터 | industry-codes.md, evaluation-criteria.md, evaluation-templates.json |
| 18 | CLAUDE.md, README.md | 프로젝트 문서 |

---

## 11. 향후 확장 계획

| 기능 | 설명 | 우선순위 |
|---|---|---|
| 낙찰 이력 분석 | 유사 공고의 과거 낙찰 정보로 경쟁 강도 분석 | 높음 |
| 기업마당/NTIS 연동 | bizinfo_search_support, ntis_search_projects Tool 추가 | 높음 |
| 제안서 초안 생성 | 평가 결과 기반 제안서 구조/목차 자동 생성 | 중간 |
| 공고 알림 | 매칭 키워드에 맞는 신규 공고 자동 알림 | 중간 |
| HWP 파일 지원 | hwp2txt 등 변환 도구 연동으로 한글 파일 분석 | 중간 |
| 컨소시엄 매칭 | 부족한 역량을 보완할 파트너 기업 추천 | 낮음 |
| 다국어 지원 | 해외 조달(UN, 세계은행 등) 공고 검색 | 낮음 |

---

## 부록: 컴포넌트 요약

| 컴포넌트 | 파일 경로 | 호출 방식 | 역할 |
|---|---|---|---|
| **company-profiler** (스킬) | skills/company-profiler/SKILL.md | 자동 | 기업 문서 분석 시 프로파일링 |
| **proposal-strategist** (스킬) | skills/proposal-strategist/SKILL.md | 자동 | 입찰/제안 시 전략 관점 적용 |
| **analyze** (커맨드) | commands/analyze.md | /proposal-specialist:analyze | 기업 문서 분석 |
| **search** (커맨드) | commands/search.md | /proposal-specialist:search | 공고 통합 검색 |
| **evaluate** (커맨드) | commands/evaluate.md | /proposal-specialist:evaluate | 제안 적합성 평가 |
| **strategy** (커맨드) | commands/strategy.md | /proposal-specialist:strategy | 전체 워크플로우 실행 |
| **doc-analyzer** (에이전트) | agents/doc-analyzer.md | 자동/수동 | 기업 문서 심층 분석 |
| **bid-searcher** (에이전트) | agents/bid-searcher.md | 자동/수동 | 다중 플랫폼 공고 검색 |
| **rfp-evaluator** (에이전트) | agents/rfp-evaluator.md | 자동/수동 | RFP 분석 및 제안 전략 수립 |
| **SessionStart 훅** | hooks/hooks.json | 자동 | 세션 시작 시 환경 변수 검증 |
| **환경 검증** (스크립트) | scripts/validate-env.sh | 훅에서 호출 | API 키 설정 여부 확인 |
| **procurement-api** (MCP) | servers/ + .mcp.json | Tool 호출 | 외부 API 접근 (11개 Tool) |
