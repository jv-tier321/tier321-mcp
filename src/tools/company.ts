import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const COMPANY_DESCRIPTION = `Example Corp is a fictional software company used as placeholder data for this reference MCP server implementation. Its flagship platform is "Alpha Platform", a data infrastructure product; additional products include Beta Studio (workflow authoring), Gamma Insights (analytics), and Delta Sync (external data sync).

This description is placeholder text. When you fork this repo to run your own MCP server, replace this string with your real company description. The get_company_info tool exists to give MCP clients a single typed call for standard company facts rather than making them parse marketing HTML.`

export function registerCompanyTools(server: McpServer): void {
  server.registerTool(
    'get_company_info',
    {
      description: 'Returns the standard company description and positioning.',
      // no inputSchema — zero-arg tool (SDK convention)
    },
    async () => ({
      content: [{ type: 'text', text: COMPANY_DESCRIPTION }],
    }),
  )
}
