import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { listBlogPosts, getBlogPost } from '../lib/blog-loader.js'

export function registerBlogTools(server: McpServer): void {
  server.registerTool(
    'list_blog_posts',
    {
      description: "List the organization's published blog posts (metadata only, no body).",
      // no inputSchema — zero-arg tool (SDK convention)
    },
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(listBlogPosts(), null, 2) }],
    }),
  )

  server.registerTool(
    'get_blog_post',
    {
      description: 'Get a blog post by slug (returns full markdown body plus metadata).',
      inputSchema: {
        slug: z.string().describe('Post slug, e.g. "welcome-to-example"'),
      },
    },
    async ({ slug }) => {
      const post = getBlogPost(slug)
      if (!post) {
        return {
          content: [{ type: 'text', text: `Blog post not found: ${slug}` }],
          isError: true,
        }
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(post, null, 2) }],
      }
    },
  )
}
