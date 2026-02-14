import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const NTIS_API_KEY = process.env.NTIS_API_KEY;

export function registerNtisTools(server: McpServer) {
  server.tool(
    'ntis_search_projects',
    'NTIS 국가R&D 과제 정보를 검색합니다. 국가 연구개발 과제, 성과 정보를 조회합니다.',
    {
      keyword: z.string().optional().describe('검색 키워드'),
      pageNo: z.number().default(1),
      numOfRows: z.number().default(20),
    },
    async (args) => {
      if (!NTIS_API_KEY) {
        return {
          content: [{
            type: 'text' as const,
            text: 'NTIS_API_KEY 환경 변수가 설정되지 않았습니다. NTIS R&D 과제 검색을 사용하려면 ntis.go.kr에서 API 키를 발급받으세요.',
          }],
          isError: true,
        };
      }

      // NTIS API는 별도 포털에서 제공하며 엔드포인트가 다름
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            message: 'NTIS API 연동은 향후 업데이트에서 지원됩니다. ntis.go.kr에서 직접 검색하세요.',
            searchUrl: 'https://www.ntis.go.kr',
          }, null, 2),
        }],
      };
    }
  );
}
