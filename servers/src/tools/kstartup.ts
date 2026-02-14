import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { callDataGoKrApi } from '../utils/api-client.js';

const KSTARTUP_BASE = 'https://apis.data.go.kr/B552735/kisedKstartupService01';
const KSTARTUP_OPTIONS = { responseFormatKey: 'returnType' };

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
        },
        KSTARTUP_OPTIONS
      );

      // K-스타트업 API는 응답 구조가 다름
      const items = data.data || [];
      const activeItems = items.filter(
        (item: any) => item.rcrt_prgs_yn === 'Y'
      );

      return {
        content: [{
          type: 'text' as const,
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
        },
        KSTARTUP_OPTIONS
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            totalCount: data.totalCount,
            items: data.data || [],
          }, null, 2),
        }],
      };
    }
  );
}
