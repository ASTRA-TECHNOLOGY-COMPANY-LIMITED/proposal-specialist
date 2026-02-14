import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
          content: [{ type: 'text' as const, text: 'Error: 파일명에 ".."을 포함할 수 없습니다.' }],
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
            type: 'text' as const,
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
            type: 'text' as const,
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
          type: 'text' as const,
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
            type: 'text' as const,
            text: JSON.stringify({ directory: targetDir, files }, null, 2),
          }],
        };
      } catch {
        return {
          content: [{
            type: 'text' as const,
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
