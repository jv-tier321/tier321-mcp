import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { useCases } from '../data/use-cases.js'

export function registerUseCaseTools(server: McpServer): void {
  server.registerTool(
    'list_use_cases',
    {
      description: "List the organization's documented product capabilities and use cases.",
      // no inputSchema — zero-arg tool (SDK convention)
    },
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(useCases, null, 2) }],
    }),
  )
}
