import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const BIZINFO_API_KEY = process.env.BIZINFO_API_KEY;

export function registerBizInfoTools(server: McpServer) {
  server.tool(
    'bizinfo_search_support',
    '기업마당 지원사업 정보를 검색합니다. 중소기업 대상 지원사업, 정책자금, 교육 등의 정보를 제공합니다.',
    {
      keyword: z.string().optional().describe('검색 키워드'),
      pageNo: z.number().default(1),
      numOfRows: z.number().default(20),
    },
    async (args) => {
      if (!BIZINFO_API_KEY) {
        return {
          content: [{
            type: 'text' as const,
            text: 'BIZINFO_API_KEY 환경 변수가 설정되지 않았습니다. 기업마당 API를 사용하려면 bizinfo.go.kr에서 API 키를 발급받으세요.',
          }],
          isError: true,
        };
      }

      const url = new URL('https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do');
      url.searchParams.set('crtfcKey', BIZINFO_API_KEY);
      url.searchParams.set('dataType', 'json');
      url.searchParams.set('pageNo', String(args.pageNo));
      url.searchParams.set('numOfRows', String(args.numOfRows));

      if (args.keyword) url.searchParams.set('searchKeyword', args.keyword);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(data, null, 2),
        }],
      };
    }
  );
}
