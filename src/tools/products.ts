import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { products, type ProductStatus } from '../data/products.js'

const StatusEnum = z.enum(['shipped', 'shipped-beta', 'in-development', 'coming-soon'])

export function registerProductTools(server: McpServer): void {
  server.registerTool(
    'list_products',
    {
      description: "List the organization's product portfolio. Optional status filter.",
      inputSchema: {
        status: z
          .array(StatusEnum)
          .optional()
          .describe('Filter by lifecycle status (e.g., ["shipped"])'),
      },
    },
    async ({ status }) => {
      const filtered = status
        ? products.filter((p) => status.includes(p.status as ProductStatus))
        : products
      return {
        content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }],
      }
    },
  )

  server.registerTool(
    'get_product',
    {
      description: 'Get full detail for a single product by id.',
      inputSchema: {
        id: z.string().describe('Product id, e.g. "alpha-platform"'),
      },
    },
    async ({ id }) => {
      const product = products.find((p) => p.id === id)
      if (!product) {
        return {
          content: [{ type: 'text', text: `Product not found: ${id}` }],
          isError: true,
        }
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(product, null, 2) }],
      }
    },
  )
}
