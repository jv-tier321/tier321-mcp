import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const CONTACT = {
  email: 'hello@example.com',
  contact_form: 'https://example.com/contact',
  notes:
    'This is placeholder contact information for the tier321-mcp reference implementation. Replace with your real channels when forking. This server has no programmatic submission or write tools.',
}

export function registerContactTools(server: McpServer): void {
  server.registerTool(
    'get_contact_methods',
    {
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      description:
        'Return ways to reach the organization (email, forms). Read-only — no programmatic submission.',
      // no inputSchema — zero-arg tool (SDK convention)
    },
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(CONTACT, null, 2) }],
    }),
  )
}
