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

      // 게시일 기준 3개월 이내 공고만 필터링 (마감일 필드 없음)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const mappedItems = items.map((item: any) => ({
        subject: item.subject,
        viewUrl: item.viewUrl,
        deptName: item.deptName,
        pressDt: item.pressDt,
        fileName: item.fileName,
        fileUrl: item.fileUrl,
      }));

      const recentItems = mappedItems.filter((item: any) => {
        if (!item.pressDt) return true; // 게시일 없으면 포함
        const pressDate = new Date(item.pressDt);
        return !isNaN(pressDate.getTime()) && pressDate >= threeMonthsAgo;
      });
      const filteredCount = mappedItems.length - recentItems.length;

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            totalCount: recentItems.length,
            serverTotalCount: data.totalCount,
            filteredCount,
            items: recentItems,
          }, null, 2),
        }],
      };
    }
  );
}
