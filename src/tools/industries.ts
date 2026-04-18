import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { industries } from '../data/industries.js'

export function registerIndustryTools(server: McpServer): void {
  server.registerTool(
    'list_industries',
    {
      description: 'List the industries the organization builds platforms for.',
      // no inputSchema — zero-arg tool (SDK convention)
    },
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(industries, null, 2) }],
    }),
  )
}
