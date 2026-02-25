# proposal-specialist 사용 매뉴얼

## 개요

proposal-specialist는 기업 문서를 분석하여 공공조달 입찰공고를 탐색하고, RFP를 분석하여 제안서를 작성하는 Claude Code 플러그인입니다.

크게 두 가지 워크플로우를 제공합니다:

1. **공고 탐색 워크플로우**: 기업 분석 → 공고 검색 → 적합성 평가
2. **제안서 작성 워크플로우**: RFP 분석 → 목차 생성 → 섹션 작성

---

## 설치

```bash
# Claude Code에서 플러그인 설치
/install-plugin https://github.com/ASTRA-TECHNOLOGY-COMPANY-LIMITED/proposal-specialist
```

### 환경 변수 설정

| 환경 변수 | 필수 | 용도 |
|-----------|------|------|
| `DATA_GO_KR_API_KEY` | 필수 | 나라장터, K-스타트업, 중기부, 과기부 API |
| `BIZINFO_API_KEY` | 선택 | 기업마당(BizInfo) API |
| `NTIS_API_KEY` | 선택 | NTIS 국가 R&D 과제 검색 API |

API 키는 [공공데이터포털](https://www.data.go.kr)에서 발급받습니다.

---

## 워크플로우 1: 공고 탐색

기업 문서를 기반으로 적합한 공공조달 입찰공고를 찾고 성공 가능성을 평가합니다.

### 전체 흐름

```
[기업 문서] → analyze → search → evaluate → 평가 보고서
                ↕           ↕          ↕
            기업 프로필    공고 목록    SWOT + 전략
```

### Step 1: 기업 문서 분석 (`analyze`)

```
/proposal-specialist:analyze ./회사소개서.pdf
```

기업 소개서, 기술 문서를 분석하여 다음을 도출합니다:
- 기업 프로필 (업종, 규모, 기술 스택, 인증/자격)
- 주요 수행 실적
- 나라장터 검색용 키워드 (우선순위별 10~15개)
- 적합 사업 유형 (용역, 물품, K-스타트업, R&D 등)

### Step 2: 공고 검색 (`search`)

```
/proposal-specialist:search AI 솔루션 클라우드
```

키워드 기반으로 6개 플랫폼을 병렬 검색합니다:
- 나라장터 (용역/물품 입찰공고, 사전규격)
- K-스타트업 지원사업
- 중소벤처기업부 사업공고
- 과학기술정보통신부 사업공고

마감된 공고는 자동 제외되며, 적합도 순으로 정렬됩니다.

### Step 3: 적합성 평가 (`evaluate`)

```
/proposal-specialist:evaluate 20260101001
```

특정 공고에 대해 심층 분석합니다:
1. 공고 상세 조회 및 첨부파일 다운로드
2. RFP 문서 분석 (PDF 자동 분할 읽기)
3. 5개 항목 100점 만점 평가 (자격요건, 기술역량, 유사실적, 가격경쟁력, 일정)
4. SWOT 분석
5. 제안 방향 및 준비 체크리스트

### 원스텝: 전체 워크플로우 (`strategy`)

```
/proposal-specialist:strategy ./회사소개서.pdf
```

위 3단계를 하나의 명령으로 실행합니다:
- Phase 1: 기업 분석 → 키워드 도출 → 사용자 확인
- Phase 2: 병렬 공고 검색
- Phase 3: 사용자가 선택한 공고 심층 분석 (반복)
- Phase 4: 종합 비교 보고서 작성

---

## 워크플로우 2: 제안서 작성

RFP와 기업 시드 문서를 기반으로 제안서 목차를 생성하고 섹션별 상세 내용을 작성합니다.

### 전체 흐름

```
[RFP 문서] + [기업 시드 문서]
    → generate-toc → 목차.md (YAML 메타데이터 + 섹션별 전략)
    → generate-common → _common/ (CSS, JS, 설정)
    → write-section → sections/*.html (완전한 HTML 페이지)
```

### 사전 준비

#### RFP 문서

제안요청서(RFP) PDF 파일을 준비합니다. 다음 정보가 포함되어야 합니다:
- 사업명, 사업기간, 사업예산
- 입찰방식 및 계약방법
- 기술능력 평가항목 및 배점표
- 기능/성능/보안 요구사항 목록
- 제안서 작성요령 (RFP 규정 목차)

권장 경로: `data/business/{사업명}/제안요청서.pdf`

#### 기업 시드 문서

기업의 강점과 실적을 정리한 마크다운 파일을 준비합니다. 포함 항목:
- 기업 기본 정보 (기업명, 설립연도, 소재지)
- 재무 현황 (매출, 자본금)
- 보유 인증/자격
- 핵심 인력 (이름, 자격, 경력)
- 주요 수행 실적 (발주처, 사업명, 금액, 기간)
- 자체 솔루션/플랫폼
- 기술 스택

권장 경로: `data/seed/{기업명}/시드.md`

### Step 1: 목차 생성 (`generate-toc`)

```
/proposal-specialist:generate-toc data/business/사업명/제안요청서.pdf data/seed/회사명/시드.md
```

**실행 과정:**
1. RFP를 읽어 사업명, 평가기준 배점표, 요구사항, 작성요령을 추출
2. 시드 문서를 읽어 기업 강점, 실적, 인력, 기술스택을 추출
3. toc-generator 에이전트가 평가기준 ↔ 기업 강점을 매핑
4. 배점 비중에 따라 섹션 깊이를 조정 (고배점 = 더 많은 절과 페이지)
5. 각 섹션에 도표/도안 계획 수립

**출력:**
- `data/output/{사업명_경로}/목차.md`
- YAML 프론트매터 (사업명, 발주처, 평가방식, RFP/시드 경로)
- 섹션별 메타데이터 (배점, 핵심메시지, 강조강점, 요구사항, 도표, 도안, 페이지예산)

### Step 1.5: 공통 리소스 생성 (`generate-common`)

```
/proposal-specialist:generate-common data/output/사업명/목차.md
```

**실행 과정:**
1. 목차 파일에서 장 구조와 페이지예산을 읽어 장별 시작 페이지 계산
2. `page-frame.css`, `page-frame.js`를 `_common/` 디렉토리에 복사
3. `common-config.json` 생성 (사업명, 발주처, 장별 startPage, 총페이지)

**출력:**
- `data/output/{사업명_경로}/_common/page-frame.css`
- `data/output/{사업명_경로}/_common/page-frame.js`
- `data/output/{사업명_경로}/_common/common-config.json`

### Step 2: 섹션 작성 (`write-section`)

```
# 전체 섹션 작성
/proposal-specialist:write-section data/output/사업명/목차.md

# 특정 섹션만 작성
/proposal-specialist:write-section data/output/사업명/목차.md 1 3 5
```

**실행 과정:**
1. 목차 파일에서 섹션 목록 및 메타데이터 추출
2. `_common/common-config.json`에서 장별 시작 페이지 정보 로드
3. RFP와 시드 문서를 다시 읽어 전체 컨텍스트 확보
4. 사용자에게 작성 범위 확인
5. 각 섹션별 순차 작성:
   - 관련 RFP 요구사항 조회
   - section-writer 에이전트가 섹션 유형(A~K) 분류 후 전략 적용
   - 인라인 HTML 도표 + HTML/CSS 도안 직접 작성 (별도 파일 없음)
   - 완전한 HTML 페이지로 저장 (헤더/푸터/페이지번호 자동 적용)
6. 진행 상황 실시간 보고
7. 최종 요약 보고

**출력 디렉토리 구조:**

```
data/output/{사업명_경로}/
├── 목차.md                    ← 목차 + 섹션별 메타데이터
├── _common/
│   ├── page-frame.css         ← 공통 CSS (페이지 프레임 + 차트 컴포넌트)
│   ├── page-frame.js          ← 헤더/푸터 자동 주입 + 오버플로 분할
│   └── common-config.json     ← 장별 시작 페이지 설정
└── sections/
    ├── 01_제안사일반현황.html  ← 완전한 HTML (도표+도안 인라인 포함)
    ├── 02_조직및인원현황.html
    └── ...
```

### Step 3: 검토 및 재작성

작성 완료 후 검토 가이드:

1. 각 HTML 파일을 브라우저(Chrome)에서 열어 헤더/푸터/페이지번호 확인
2. `<!-- 작성 메모 -->` HTML 주석에서 보완 사항 확인
3. `{확인 필요}` 표시된 항목을 실제 데이터로 교체
4. 도표와 도안이 올바르게 렌더링되는지 확인 (HTML 소스를 직접 수정 가능)
5. 각 섹션이 A4 페이지를 꽉 채우고 있는지 확인

특정 섹션을 재작성하려면:
```
/proposal-specialist:write-section data/output/사업명/목차.md 3
```

---

## 섹션 유형 가이드 (A~K)

section-writer는 섹션 제목을 기반으로 유형을 자동 분류하고 최적화된 전략을 적용합니다.

- **A** 사업이해도: AS-IS → 문제 → TO-BE → 제안 방향
- **B** 추진전략: 차별화 3축 헤드라인 + 근거
- **C** 기술방안: 요구사항 1:1 대응표 + 아키텍처
- **D** 개발방법론: 표준 준수 + 방법론 + 스프린트
- **E** 수행조직: 조직도 + 인력 프로필 + R&R
- **F** 일정계획: 마일스톤 + WBS + 보고 일정
- **G** 품질/보안: 체계 → 식별 → 평가 → 대응
- **H** 유사실적: 3건 이상 상세 + 정량 성과
- **I** 기대효과: 정량+정성 분리, 발주기관 목표 연결
- **J** 교육훈련: 교육 계획표 + 기술이전 체크리스트
- **K** 하자보수: SLA 수준표 + 대응 절차

---

## HTML 디자인 시스템

모든 도표와 도안은 섹션 HTML 내에 인라인으로 작성합니다.

### 사용 가능한 컴포넌트

모든 컴포넌트는 섹션 HTML 내에 인라인으로 작성됩니다 (별도 파일 불필요).

- **데이터 테이블** (`<table>`): 요구사항 대응표, 인력 현황표
- **AS-IS/TO-BE 비교표** (`.comparison`): 현행↔목표 시각적 대비
- **프로세스 플로우** (`.flow-container`): 수행 절차, 업무 흐름도
- **KPI 수치 카드** (`.kpi-grid`): 기대효과, 성과지표
- **타임라인** (`.timeline`): 일정계획, 마일스톤
- **조직도** (`.org-chart`): 추진 체계, 팀 구성
- **강조 박스** (`.highlight-box`): 핵심 메시지, 차별화 포인트
- **상태 뱃지** (`.badge-*`): 항목 상태/등급 표시
- **CSS 도안**: 아키텍처도, 체계도, 인포그래픽 (flexbox/grid + border + 유니코드 화살표)
- **인라인 SVG**: 복잡한 도형/패스가 필요한 경우

### 디자인 토큰 (컬러)

- `--primary: #1B3A5C` (네이비 블루)
- `--accent: #0078D4` (액센트 블루)
- `--success: #2E7D32` (그린)
- `--warning: #F57C00` (오렌지)
- `--danger: #C62828` (레드)

---

## 디렉토리 구조

```
proposal-specialist/
├── .claude-plugin/
│   ├── plugin.json              ← 플러그인 매니페스트
│   └── marketplace.json         ← 마켓플레이스 등록 정보
├── commands/                    ← 사용자 호출 명령어
│   ├── analyze.md               ← /proposal-specialist:analyze
│   ├── search.md                ← /proposal-specialist:search
│   ├── evaluate.md              ← /proposal-specialist:evaluate
│   ├── strategy.md              ← /proposal-specialist:strategy
│   ├── generate-toc.md          ← /proposal-specialist:generate-toc
│   ├── generate-common.md       ← /proposal-specialist:generate-common
│   └── write-section.md         ← /proposal-specialist:write-section
├── agents/                      ← 서브에이전트 (도구 사용)
│   ├── doc-analyzer.md          ← 기업 문서 심층 분석
│   ├── bid-searcher.md          ← 멀티 플랫폼 병렬 검색
│   ├── rfp-evaluator.md         ← RFP 분석, 성공 확률 평가
│   ├── toc-generator.md         ← 제안서 목차 생성
│   └── section-writer.md        ← 제안서 섹션 작성
├── skills/                      ← 자동 참조 레퍼런스
│   ├── company-profiler/        ← 기업 프로파일링
│   ├── proposal-strategist/     ← 제안 전략
│   ├── html-design-system/      ← HTML 디자인 시스템 (CSS/JS/템플릿)
│   └── section-type-guide/      ← 섹션 유형별 전략 (A~K)
├── servers/                     ← MCP 서버 (TypeScript)
│   └── src/tools/               ← G2B, K-Startup, BizInfo 등 API 도구
├── data/
│   ├── seed/                    ← 기업 시드 문서
│   ├── business/                ← RFP 문서
│   ├── output/                  ← 생성된 제안서 (gitignore)
│   └── evaluation-templates.json ← 평가기준 템플릿
├── scripts/
│   └── validate-env.sh          ← 환경 변수 검증 (세션 시작 시)
└── docs/
    └── manual.md                ← 이 문서
```

---

## 명령어 요약

| 명령어 | 용도 | 인자 |
|--------|------|------|
| `analyze` | 기업 문서 분석 | `<문서경로>` |
| `search` | 공고 통합 검색 | `<키워드...>` |
| `evaluate` | 공고 적합성 평가 | `<공고번호>` |
| `strategy` | 전체 워크플로우 (분석→검색→평가) | `<문서경로>` |
| `generate-toc` | 제안서 목차 생성 | `<RFP경로> <시드경로>` |
| `generate-common` | 공통 리소스 생성 (CSS/JS/설정) | `<목차파일>` |
| `write-section` | 제안서 섹션 작성 (HTML 페이지) | `<목차파일> [섹션번호...]` |

---

## FAQ

**Q: HWP 파일을 분석할 수 있나요?**
A: HWP는 직접 분석이 어렵습니다. PDF로 변환한 후 사용해주세요.

**Q: 100페이지 이상의 RFP는 어떻게 처리하나요?**
A: 목차, 요구사항, 평가기준 섹션을 선택적으로 읽어 핵심 정보만 추출합니다.

**Q: 도표나 도안을 수정하고 싶으면?**
A: `sections/` 폴더의 HTML 파일을 직접 열어 소스를 수정하면 됩니다. 모든 도표와 도안이 HTML/CSS로 인라인 작성되어 있어 텍스트 편집기에서 바로 수정 가능합니다.

**Q: 특정 섹션만 재작성할 수 있나요?**
A: `write-section` 명령에 섹션 번호를 지정하면 해당 섹션만 재작성합니다.

**Q: API 키 없이 사용할 수 있나요?**
A: `DATA_GO_KR_API_KEY`는 필수입니다. 이 키 없이는 공고 검색이 불가합니다. 제안서 작성(generate-toc, write-section)은 API 키 없이도 사용 가능합니다.
