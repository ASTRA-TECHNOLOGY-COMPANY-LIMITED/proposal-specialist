import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { callDataGoKrApi } from '../utils/api-client.js';

const MSIT_BASE = 'https://apis.data.go.kr/1721000/msitannouncementinfo';
const MSIT_OPTIONS = { responseFormatKey: 'returnType', serviceKeyName: 'ServiceKey' };

export function registerMsitTools(server: McpServer) {
  server.tool(
    'msit_search_announcements',
    '과학기술정보통신부 사업공고를 검색합니다. R&D, ICT, 과학기술 관련 사업공고를 찾습니다.',
    {
      pageNo: z.number().default(1),
      numOfRows: z.number().default(20),
    },
    async (args) => {
      const data = await callDataGoKrApi(
        MSIT_BASE,
        'businessAnnouncMentList',
        {
          pageNo: args.pageNo,
          numOfRows: args.numOfRows,
        },
        MSIT_OPTIONS
      );

      const items = data.items || [];

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            totalCount: data.totalCount,
            items: items.map((item: any) => ({
              subject: item.subject,
              viewUrl: item.viewUrl,
              deptName: item.deptName,
              pressDt: item.pressDt,
              fileName: item.fileName,
              fileUrl: item.fileUrl,
            })),
          }, null, 2),
        }],
      };
    }
  );
}
