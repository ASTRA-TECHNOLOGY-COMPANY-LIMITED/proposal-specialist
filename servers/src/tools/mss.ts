import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { callDataGoKrApi } from '../utils/api-client.js';

const MSS_BASE = 'https://apis.data.go.kr/1421000/mssBizService_v2';

export function registerMssTools(server: McpServer) {
  server.tool(
    'mss_search_announcements',
    '중소벤처기업부 사업공고를 검색합니다. 중소기업 지원사업, 정책자금 등의 공고를 찾습니다.',
    {
      startDate: z.string().optional()
        .describe('공고등록일 검색시작 (YYYY-MM-DD)'),
      endDate: z.string().optional()
        .describe('공고등록일 검색종료 (YYYY-MM-DD)'),
      pageNo: z.number().default(1),
      numOfRows: z.number().default(20),
    },
    async (args) => {
      const params: Record<string, string | number> = {
        pageNo: args.pageNo,
        numOfRows: args.numOfRows,
      };

      if (args.startDate) params.startDate = args.startDate;
      if (args.endDate) params.endDate = args.endDate;

      const data = await callDataGoKrApi(MSS_BASE, 'getbizList_v2', params);

      const items = data.items || [];

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            totalCount: data.totalCount,
            items: items.map((item: any) => ({
              title: item.title,
              dataContents: item.dataContents,
              viewUrl: item.viewUrl,
              fileName: item.fileName,
              fileUrl: item.fileUrl,
              applicationStartDate: item.applicationStartDate,
              applicationEndDate: item.applicationEndDate,
            })),
          }, null, 2),
        }],
      };
    }
  );
}
