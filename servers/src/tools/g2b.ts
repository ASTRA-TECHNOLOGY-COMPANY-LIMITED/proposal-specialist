import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { callDataGoKrApi } from '../utils/api-client.js';
import { getDefaultDateRange, toG2bDateFormat, calcDeadlineInfo } from '../utils/date-utils.js';

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

      // 키워드 검색 시 최대 결과를 가져와서 클라이언트 측 필터링
      const fetchSize = args.keyword ? 999 : args.numOfRows;

      const params: Record<string, string | number> = {
        pageNo: args.pageNo,
        numOfRows: fetchSize,
        inqryDiv: 1,
        inqryBgnDt: args.startDate
          ? toG2bDateFormat(args.startDate)
          : defaults.start,
        inqryEndDt: args.endDate
          ? toG2bDateFormat(args.endDate, '2359')
          : defaults.end,
      };

      // 서버 측 필터링도 시도 (API가 지원하는 경우를 위해)
      if (args.keyword) params.bidNtceNm = args.keyword;
      if (args.minPrice) params.presmptPrceBgn = args.minPrice;
      if (args.maxPrice) params.presmptPrceEnd = args.maxPrice;

      const data = await callDataGoKrApi(G2B_BID_BASE_URL, operation, params);

      let items = data.items || [];

      // 클라이언트 측 키워드 필터링 (API 서버가 bidNtceNm 필터를 무시하는 경우 대비)
      if (args.keyword) {
        const keywords = args.keyword.split(/\s+/).filter(Boolean);
        items = items.filter((item: any) => {
          const name = (item.bidNtceNm || '').toLowerCase();
          return keywords.some((kw: string) => name.includes(kw.toLowerCase()));
        });
      }

      // 마감일 정보 계산 및 마감 건 필터링
      const itemsWithDeadline = items.map((item: any) => {
        const deadlineInfo = calcDeadlineInfo(item.bidClseDt);
        return {
          bidNtceNo: item.bidNtceNo,
          bidNtceNm: item.bidNtceNm,
          ntceInsttNm: item.ntceInsttNm,
          dminsttNm: item.dminsttNm,
          presmptPrce: item.presmptPrce,
          bidClseDt: item.bidClseDt,
          bidNtceUrl: item.bidNtceUrl,
          hasAttachment: !!(item.ntceSpecDocUrl1),
          isClosed: deadlineInfo.isClosed,
          daysRemaining: deadlineInfo.daysRemaining,
          deadlineStatus: deadlineInfo.deadlineStatus,
        };
      });

      const activeItems = itemsWithDeadline.filter((item: any) => !item.isClosed);
      const expiredCount = itemsWithDeadline.length - activeItems.length;
      const summary = activeItems.slice(0, args.numOfRows);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            totalCount: activeItems.length,
            serverTotalCount: data.totalCount,
            expiredCount,
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
            type: 'text' as const,
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
          type: 'text' as const,
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
        inqryDiv: 1,
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
          type: 'text' as const,
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
          type: 'text' as const,
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
          type: 'text' as const,
          text: JSON.stringify(data, null, 2),
        }],
      };
    }
  );
}
