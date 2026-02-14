# MCP Server 상세 스펙 - procurement-api

## 1. 프로젝트 구조

```
servers/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # 엔트리포인트 + MCP 서버 초기화
│   ├── tools/
│   │   ├── g2b.ts               # 나라장터 입찰공고/사전규격/낙찰 Tools
│   │   ├── kstartup.ts          # K-스타트업 Tools
│   │   ├── bizinfo.ts           # 기업마당 Tools
│   │   ├── mss.ts               # 중소벤처기업부 Tools
│   │   ├── msit.ts              # 과학기술정보통신부 Tools
│   │   ├── ntis.ts              # NTIS Tools
│   │   └── file-manager.ts      # 파일 다운로드/관리 Tools
│   ├── types/
│   │   └── api-types.ts         # 공통 타입 정의
│   └── utils/
│       ├── api-client.ts        # HTTP 클라이언트 (공공데이터포털 공통)
│       └── date-utils.ts        # 날짜 변환 유틸리티
└── dist/                        # 빌드 결과물
    └── index.js
```

## 2. package.json

```json
{
  "name": "proposal-specialist-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

## 3. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

## 4. 엔트리포인트 (index.ts)

```typescript
import { McpServer, StdioServerTransport } from '@modelcontextprotocol/sdk/server/index.js';
import { registerG2bTools } from './tools/g2b.js';
import { registerKStartupTools } from './tools/kstartup.js';
import { registerBizInfoTools } from './tools/bizinfo.js';
import { registerMssTools } from './tools/mss.js';
import { registerMsitTools } from './tools/msit.js';
import { registerNtisTools } from './tools/ntis.js';
import { registerFileManagerTools } from './tools/file-manager.js';

const server = new McpServer({
  name: 'procurement-api',
  version: '1.0.0',
});

// Tool 등록
registerG2bTools(server);
registerKStartupTools(server);
registerBizInfoTools(server);
registerMssTools(server);
registerMsitTools(server);
registerNtisTools(server);
registerFileManagerTools(server);

// stdio transport로 시작
const transport = new StdioServerTransport();
await server.connect(transport);
```

## 5. Tool 구현 상세

### 5.1 나라장터 (g2b.ts)

#### Tool: `g2b_search_bids`

```typescript
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { callDataGoKrApi } from '../utils/api-client.js';
import { getDefaultDateRange, toG2bDateFormat } from '../utils/date-utils.js';

const G2B_BID_BASE_URL = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService';

const categoryOperationMap: Record<string, string> = {
  servc: 'getBidPblancListInfoServc',
  thng: 'getBidPblancListInfoThng',
  cnstwk: 'getBidPblancListInfoCnstwk',
  frgcpt: 'getBidPblancListInfoFrgcpt',
};

export function registerG2bTools(server: McpServer) {
  // 입찰공고 검색
  server.tool(
    'g2b_search_bids',
    '나라장터 입찰공고를 검색합니다. 키워드, 카테고리(용역/물품/공사), 기간, 가격 범위로 필터링할 수 있습니다.',
    {
      keyword: z.string().describe('검색 키워드 (입찰공고명에서 검색)'),
      category: z.enum(['servc', 'thng', 'cnstwk', 'frgcpt'])
        .default('servc')
        .describe('분류: servc(용역), thng(물품), cnstwk(공사), frgcpt(외자)'),
      startDate: z.string().optional()
        .describe('조회시작일 (YYYY-MM-DD). 미지정 시 최근 30일'),
      endDate: z.string().optional()
        .describe('조회종료일 (YYYY-MM-DD). 미지정 시 오늘'),
      minPrice: z.number().optional()
        .describe('최소 추정가격 (원)'),
      maxPrice: z.number().optional()
        .describe('최대 추정가격 (원)'),
      pageNo: z.number().default(1),
      numOfRows: z.number().default(20).describe('결과 수 (최대 100)'),
    },
    async (args) => {
      const defaults = getDefaultDateRange();
      const operation = categoryOperationMap[args.category];

      const params: Record<string, string | number> = {
        pageNo: args.pageNo,
        numOfRows: args.numOfRows,
        inqryDiv: 1,
        inqryBgnDt: args.startDate
          ? toG2bDateFormat(args.startDate)
          : defaults.start,
        inqryEndDt: args.endDate
          ? toG2bDateFormat(args.endDate, '2359')
          : defaults.end,
      };

      if (args.keyword) params.bidNtceNm = args.keyword;
      if (args.minPrice) params.presmptPrceBgn = args.minPrice;
      if (args.maxPrice) params.presmptPrceEnd = args.maxPrice;

      const data = await callDataGoKrApi(G2B_BID_BASE_URL, operation, params);

      const items = data.items || [];
      const summary = items.map((item: any) => ({
        bidNtceNo: item.bidNtceNo,
        bidNtceNm: item.bidNtceNm,
        ntceInsttNm: item.ntceInsttNm,
        dminsttNm: item.dminsttNm,
        presmptPrce: item.presmptPrce,
        bidClseDt: item.bidClseDt,
        bidNtceUrl: item.bidNtceUrl,
        hasAttachment: !!(item.ntceSpecDocUrl1),
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            totalCount: data.totalCount,
            currentPage: args.pageNo,
            items: summary,
          }, null, 2),
        }],
      };
    }
  );

  // 입찰공고 상세 조회
  server.tool(
    'g2b_get_bid_detail',
    '나라장터 입찰공고의 상세 정보를 조회합니다. 첨부파일 URL을 포함합니다.',
    {
      bidNtceNo: z.string().describe('입찰공고번호'),
      bidNtceOrd: z.string().default('00').describe('입찰공고차수 (기본: 00)'),
      category: z.enum(['servc', 'thng', 'cnstwk', 'frgcpt'])
        .default('servc')
        .describe('분류'),
    },
    async (args) => {
      const operation = categoryOperationMap[args.category];

      const data = await callDataGoKrApi(G2B_BID_BASE_URL, operation, {
        pageNo: 1,
        numOfRows: 1,
        inqryDiv: 1,
        bidNtceNo: args.bidNtceNo,
      });

      const item = data.items?.[0];
      if (!item) {
        return {
          content: [{
            type: 'text',
            text: `입찰공고번호 ${args.bidNtceNo}에 해당하는 공고를 찾을 수 없습니다.`,
          }],
        };
      }

      // 첨부파일 URL 수집
      const attachments: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const url = item[`ntceSpecDocUrl${i}`];
        if (url) attachments.push(url);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ ...item, attachmentUrls: attachments }, null, 2),
        }],
      };
    }
  );

  // 사전규격 검색
  server.tool(
    'g2b_search_pre_specs',
    '나라장터 사전규격(발주예정) 공개 정보를 검색합니다.',
    {
      keyword: z.string().optional().describe('품명/사업명 키워드'),
      startDate: z.string().optional().describe('조회시작일 (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('조회종료일 (YYYY-MM-DD)'),
      category: z.enum(['servc', 'thng', 'cnstwk', 'frgcpt'])
        .default('servc'),
      pageNo: z.number().default(1),
      numOfRows: z.number().default(20),
    },
    async (args) => {
      const PRE_SPEC_BASE = 'https://apis.data.go.kr/1230000/ao/HrcspSsstndrdInfoService';
      const categoryMap: Record<string, string> = {
        servc: 'getPublicPrcureThngInfoServc',
        thng: 'getPublicPrcureThngInfoThng',
        cnstwk: 'getPublicPrcureThngInfoCnstwk',
        frgcpt: 'getPublicPrcureThngInfoFrgcpt',
      };

      const defaults = getDefaultDateRange();
      const params: Record<string, string | number> = {
        pageNo: args.pageNo,
        numOfRows: args.numOfRows,
        inqryBgnDt: args.startDate
          ? toG2bDateFormat(args.startDate)
          : defaults.start,
        inqryEndDt: args.endDate
          ? toG2bDateFormat(args.endDate, '2359')
          : defaults.end,
      };

      if (args.keyword) params.prdctClsfcNoNm = args.keyword;

      const data = await callDataGoKrApi(
        PRE_SPEC_BASE,
        categoryMap[args.category],
        params
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            totalCount: data.totalCount,
            items: data.items || [],
          }, null, 2),
        }],
      };
    }
  );

  // 낙찰 정보 검색
  server.tool(
    'g2b_search_awards',
    '나라장터 낙찰(개찰) 정보를 검색합니다. 경쟁 현황 분석에 활용합니다.',
    {
      keyword: z.string().optional().describe('검색 키워드'),
      startDate: z.string().optional().describe('조회시작일 (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('조회종료일 (YYYY-MM-DD)'),
      category: z.enum(['servc', 'thng', 'cnstwk', 'frgcpt'])
        .default('servc'),
      pageNo: z.number().default(1),
      numOfRows: z.number().default(20),
    },
    async (args) => {
      const AWARD_BASE = 'https://apis.data.go.kr/1230000/as/ScsbidInfoService';
      const categoryMap: Record<string, string> = {
        servc: 'getScsbidListSttusServc',
        thng: 'getScsbidListSttusThng',
        cnstwk: 'getScsbidListSttusCnstwk',
        frgcpt: 'getScsbidListSttusFrgcpt',
      };

      const defaults = getDefaultDateRange();
      const params: Record<string, string | number> = {
        pageNo: args.pageNo,
        numOfRows: args.numOfRows,
        inqryDiv: 2,
        inqryBgnDt: args.startDate
          ? toG2bDateFormat(args.startDate)
          : defaults.start,
        inqryEndDt: args.endDate
          ? toG2bDateFormat(args.endDate, '2359')
          : defaults.end,
      };

      const data = await callDataGoKrApi(
        AWARD_BASE,
        categoryMap[args.category],
        params
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            totalCount: data.totalCount,
            items: data.items || [],
          }, null, 2),
        }],
      };
    }
  );

  // 계약과정 통합 조회
  server.tool(
    'g2b_get_contract_process',
    '입찰공고번호 또는 사전규격등록번호로 계약 진행과정을 통합 조회합니다.',
    {
      bidNtceNo: z.string().optional().describe('입찰공고번호'),
      bfSpecRgstNo: z.string().optional().describe('사전규격등록번호'),
    },
    async (args) => {
      const BASE = 'https://apis.data.go.kr/1230000/ao/CntrctProcssIntgOpenService';
      const params: Record<string, string | number> = {
        pageNo: 1,
        numOfRows: 10,
      };

      if (args.bidNtceNo) params.bidNtceNo = args.bidNtceNo;
      if (args.bfSpecRgstNo) params.bfSpecRgstNo = args.bfSpecRgstNo;

      const data = await callDataGoKrApi(BASE, 'getCntrctProcssIntgInfo', params);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2),
        }],
      };
    }
  );
}
```

### 5.2 K-스타트업 (kstartup.ts)

```typescript
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { callDataGoKrApi } from '../utils/api-client.js';

const KSTARTUP_BASE = 'https://apis.data.go.kr/B552735/kisedKstartupService01';

export function registerKStartupTools(server: McpServer) {
  // 지원사업 공고 검색
  server.tool(
    'kstartup_search_announcements',
    'K-스타트업 지원사업 공고를 검색합니다. 창업 지원, 기술 개발, 사업화 지원 등의 공고를 찾습니다.',
    {
      page: z.number().default(1),
      perPage: z.number().default(20).describe('페이지당 결과 수'),
    },
    async (args) => {
      const data = await callDataGoKrApi(
        KSTARTUP_BASE,
        'getAnnouncementInformation01',
        {
          page: args.page,
          perPage: args.perPage,
          returnType: 'json',
        }
      );

      // K-스타트업 API는 응답 구조가 다름
      const items = data.data || [];
      const activeItems = items.filter(
        (item: any) => item.rcrt_prgs_yn === 'Y'
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            totalCount: data.totalCount,
            activeCount: activeItems.length,
            items: items.map((item: any) => ({
              pbancSn: item.pbanc_sn,
              bizPbancNm: item.biz_pbanc_nm,
              suptBizClsfc: item.supt_biz_clsfc,
              pbancRcptBgngDt: item.pbanc_rcpt_bgng_dt,
              pbancRcptEndDt: item.pbanc_rcpt_end_dt,
              aplyTrgt: item.aply_trgt,
              suptRegin: item.supt_regin,
              isActive: item.rcrt_prgs_yn === 'Y',
            })),
          }, null, 2),
        }],
      };
    }
  );

  // 통합공고 지원사업 정보
  server.tool(
    'kstartup_search_programs',
    'K-스타트업 통합공고 지원사업 정보를 검색합니다. 예산, 규모, 수행기관 정보를 포함합니다.',
    {
      page: z.number().default(1),
      perPage: z.number().default(20),
    },
    async (args) => {
      const data = await callDataGoKrApi(
        KSTARTUP_BASE,
        'getBusinessInformation01',
        {
          page: args.page,
          perPage: args.perPage,
          returnType: 'json',
        }
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            totalCount: data.totalCount,
            items: data.data || [],
          }, null, 2),
        }],
      };
    }
  );
}
```

### 5.3 파일 관리 (file-manager.ts)

```typescript
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || '/tmp/proposal-specialist/downloads';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function registerFileManagerTools(server: McpServer) {
  // 첨부파일 다운로드
  server.tool(
    'download_attachment',
    '공고 첨부파일(제안요청서, 규격서 등)을 다운로드합니다.',
    {
      url: z.string().url().describe('다운로드할 파일 URL'),
      filename: z.string().optional().describe('저장할 파일명 (미지정 시 URL에서 추출)'),
      bidNtceNo: z.string().optional().describe('입찰공고번호 (하위 디렉토리로 사용)'),
    },
    async (args) => {
      // 경로 순회 공격 방지
      if (args.filename && args.filename.includes('..')) {
        return {
          content: [{ type: 'text', text: 'Error: 파일명에 ".."을 포함할 수 없습니다.' }],
          isError: true,
        };
      }

      const targetDir = args.bidNtceNo
        ? path.join(DOWNLOAD_DIR, args.bidNtceNo)
        : DOWNLOAD_DIR;

      await fs.mkdir(targetDir, { recursive: true });

      const response = await fetch(args.url);
      if (!response.ok) {
        return {
          content: [{
            type: 'text',
            text: `다운로드 실패: HTTP ${response.status} ${response.statusText}`,
          }],
          isError: true,
        };
      }

      // 파일 크기 체크
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
        return {
          content: [{
            type: 'text',
            text: `파일 크기가 제한(${MAX_FILE_SIZE / 1024 / 1024}MB)을 초과합니다.`,
          }],
          isError: true,
        };
      }

      // 파일명 결정
      let filename = args.filename;
      if (!filename) {
        const disposition = response.headers.get('content-disposition');
        if (disposition) {
          const match = disposition.match(/filename[*]?=['"]?(?:UTF-8'')?([^;\r\n"']+)/i);
          if (match) filename = decodeURIComponent(match[1]);
        }
        if (!filename) {
          filename = path.basename(new URL(args.url).pathname) || 'download';
        }
      }

      const filePath = path.join(targetDir, filename);
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      const mimeType = response.headers.get('content-type') || 'application/octet-stream';

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            filePath,
            filename,
            fileSize: buffer.length,
            fileSizeHuman: formatFileSize(buffer.length),
            mimeType,
          }, null, 2),
        }],
      };
    }
  );

  // 다운로드 파일 목록
  server.tool(
    'list_downloads',
    '다운로드된 파일 목록을 조회합니다.',
    {
      bidNtceNo: z.string().optional().describe('입찰공고번호 (특정 공고 파일만 조회)'),
    },
    async (args) => {
      const targetDir = args.bidNtceNo
        ? path.join(DOWNLOAD_DIR, args.bidNtceNo)
        : DOWNLOAD_DIR;

      try {
        const entries = await fs.readdir(targetDir, { withFileTypes: true, recursive: true });
        const files = [];

        for (const entry of entries) {
          if (entry.isFile()) {
            const filePath = path.join(entry.parentPath || targetDir, entry.name);
            const stat = await fs.stat(filePath);
            files.push({
              name: entry.name,
              path: filePath,
              size: stat.size,
              sizeHuman: formatFileSize(stat.size),
              modified: stat.mtime.toISOString(),
            });
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ directory: targetDir, files }, null, 2),
          }],
        };
      } catch {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ directory: targetDir, files: [] }, null, 2),
          }],
        };
      }
    }
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
```

### 5.4 공통 유틸리티

#### api-client.ts

```typescript
const API_KEY = process.env.DATA_GO_KR_API_KEY;

interface ApiResponse {
  totalCount: number;
  numOfRows: number;
  pageNo: number;
  items: any[];
  [key: string]: any;
}

export async function callDataGoKrApi(
  baseUrl: string,
  operation: string,
  params: Record<string, string | number>
): Promise<ApiResponse> {
  if (!API_KEY) {
    throw new Error(
      'DATA_GO_KR_API_KEY 환경 변수가 설정되지 않았습니다. ' +
      'data.go.kr에서 API 키를 발급받아 설정하세요.'
    );
  }

  const url = new URL(`${baseUrl}/${operation}`);
  url.searchParams.set('serviceKey', API_KEY);
  url.searchParams.set('type', 'json');

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // 공공데이터포털 표준 응답 구조 처리
  if (data.response) {
    const header = data.response.header;
    if (header?.resultCode !== '00') {
      throw new Error(`API Error [${header?.resultCode}]: ${header?.resultMsg}`);
    }
    return data.response.body;
  }

  // K-스타트업 등 비표준 응답 구조
  return data;
}
```

#### date-utils.ts

```typescript
/**
 * YYYY-MM-DD → yyyyMMddHHmm 변환
 */
export function toG2bDateFormat(date: string, time: string = '0000'): string {
  return date.replace(/-/g, '') + time;
}

/**
 * 기본 날짜 범위 (최근 30일)
 */
export function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  return {
    start: toG2bDateFormat(formatDate(start)),
    end: toG2bDateFormat(formatDate(end), '2359'),
  };
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

## 6. Tool 전체 목록

| # | Tool 이름 | 설명 | API 소스 |
|---|-----------|------|----------|
| 1 | `g2b_search_bids` | 나라장터 입찰공고 검색 | 조달청 입찰공고정보서비스 |
| 2 | `g2b_get_bid_detail` | 입찰공고 상세 조회 | 조달청 입찰공고정보서비스 |
| 3 | `g2b_search_pre_specs` | 사전규격 검색 | 조달청 사전규격정보서비스 |
| 4 | `g2b_search_awards` | 낙찰 정보 검색 | 조달청 낙찰정보서비스 |
| 5 | `g2b_get_contract_process` | 계약과정 통합 조회 | 조달청 계약과정통합공개서비스 |
| 6 | `kstartup_search_announcements` | K-스타트업 공고 검색 | 창업진흥원 K-Startup 서비스 |
| 7 | `kstartup_search_programs` | K-스타트업 사업 정보 | 창업진흥원 K-Startup 서비스 |
| 8 | `bizinfo_search_support` | 기업마당 지원사업 검색 | 기업마당 API |
| 9 | `mss_search_announcements` | 중소벤처기업부 공고 검색 | 중소벤처기업부 사업공고 |
| 10 | `msit_search_announcements` | 과기부 사업공고 검색 | 과학기술정보통신부 사업공고 |
| 11 | `ntis_search_projects` | NTIS R&D 과제 검색 | NTIS API |
| 12 | `download_attachment` | 첨부파일 다운로드 | - |
| 13 | `list_downloads` | 다운로드 파일 목록 | - |

## 7. 빌드 및 배포

```bash
# 빌드
cd servers
npm install
npm run build

# 실행 테스트
DATA_GO_KR_API_KEY=your_key node dist/index.js

# 플러그인 전체 테스트
claude --plugin-dir /path/to/proposal-specialist
```
