import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
