import { describe, it, expect } from 'vitest'
import { SELF } from 'cloudflare:test'

type CallToolSuccess = {
  result: { content: Array<{ type: string; text: string }>; isError?: boolean }
}
type CallToolError = { error: { code: number; message: string } }
type CallToolResponse = CallToolSuccess | CallToolError

let nextId = 1

async function callTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<CallToolResponse> {
  const res = await SELF.fetch('http://example.com/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: nextId++,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  })
  return res.json() as Promise<CallToolResponse>
}

describe('get_company_info', () => {
  it('returns the standard company description', async () => {
    const res = (await callTool('get_company_info')) as CallToolSuccess
    const text = res.result.content[0]!.text
    expect(text).toMatch(/Example Corp/)
    expect(text).toMatch(/Alpha Platform/)
    expect(text).toMatch(/fictional/)
  })
})

describe('list_products', () => {
  it('returns all 8 products', async () => {
    const res = (await callTool('list_products')) as CallToolSuccess
    const payload = JSON.parse(res.result.content[0]!.text) as Array<{
      id: string
      status: string
    }>
    expect(payload.length).toBe(8)
    expect(payload.every((p) => typeof p.id === 'string')).toBe(true)
  })

  it('filters by status', async () => {
    const res = (await callTool('list_products', { status: ['shipped'] })) as CallToolSuccess
    const payload = JSON.parse(res.result.content[0]!.text) as Array<{ status: string }>
    expect(payload.every((p) => p.status === 'shipped')).toBe(true)
  })

  it('returns multiple statuses when array passed', async () => {
    const res = (await callTool('list_products', {
      status: ['shipped', 'in-development'],
    })) as CallToolSuccess
    const payload = JSON.parse(res.result.content[0]!.text) as Array<{ status: string }>
    expect(
      payload.every((p) => p.status === 'shipped' || p.status === 'in-development'),
    ).toBe(true)
  })
})

describe('get_product', () => {
  it('returns product by id', async () => {
    const res = (await callTool('get_product', { id: 'alpha-platform' })) as CallToolSuccess
    const payload = JSON.parse(res.result.content[0]!.text) as { id: string; name: string }
    expect(payload.id).toBe('alpha-platform')
    expect(payload.name.toLowerCase()).toContain('alpha')
  })

  it('returns error for unknown id', async () => {
    const res = (await callTool('get_product', { id: 'nonexistent' })) as CallToolSuccess
    expect(res.result.isError).toBe(true)
    const text = res.result.content[0]!.text
    expect(text.toLowerCase()).toContain('not found')
  })
})

describe('list_blog_posts', () => {
  it('returns at least one post with required metadata', async () => {
    const res = (await callTool('list_blog_posts')) as CallToolSuccess
    const posts = JSON.parse(res.result.content[0]!.text) as Array<{
      slug: string
      title: string
    }>
    expect(posts.length).toBeGreaterThan(0)
    expect(posts[0]!.slug).toBeTruthy()
    expect(posts[0]!.title).toBeTruthy()
  })

  it('returns posts newest-first by date', async () => {
    const res = (await callTool('list_blog_posts')) as CallToolSuccess
    const posts = JSON.parse(res.result.content[0]!.text) as Array<{
      slug: string
      date: string
    }>
    const timestamps = posts.map((p) => new Date(p.date).getTime())
    const sorted = [...timestamps].sort((a, b) => b - a)
    expect(timestamps).toEqual(sorted)
  })
})

describe('get_blog_post', () => {
  it('returns full post by slug', async () => {
    const res = (await callTool('get_blog_post', {
      slug: 'welcome-to-example',
    })) as CallToolSuccess
    const post = JSON.parse(res.result.content[0]!.text) as { slug: string; content: string }
    expect(post.slug).toBe('welcome-to-example')
    expect(post.content.length).toBeGreaterThan(100)
  })

  it('returns error for unknown slug', async () => {
    const res = (await callTool('get_blog_post', { slug: 'nonexistent' })) as CallToolSuccess
    expect(res.result.isError).toBe(true)
    const text = res.result.content[0]!.text
    expect(text.toLowerCase()).toContain('not found')
  })
})

describe('list_industries', () => {
  it('returns the 8 industries', async () => {
    const res = (await callTool('list_industries')) as CallToolSuccess
    const payload = JSON.parse(res.result.content[0]!.text) as Array<{
      slug: string
      name: string
    }>
    expect(payload.length).toBe(8)
    expect(payload.every((i) => typeof i.slug === 'string' && i.slug.length > 0)).toBe(true)
    expect(payload.every((i) => typeof i.name === 'string' && i.name.length > 0)).toBe(true)
    expect(new Set(payload.map((i) => i.slug)).size).toBe(payload.length)
  })
})

describe('list_use_cases', () => {
  it('returns the 4 use cases', async () => {
    const res = (await callTool('list_use_cases')) as CallToolSuccess
    const payload = JSON.parse(res.result.content[0]!.text) as Array<{
      slug: string
      name: string
    }>
    expect(payload.length).toBe(4)
    expect(payload.every((u) => typeof u.slug === 'string' && u.slug.length > 0)).toBe(true)
    expect(new Set(payload.map((u) => u.slug)).size).toBe(payload.length)
  })
})

describe('get_contact_methods', () => {
  it('returns contact email and form URL', async () => {
    const res = (await callTool('get_contact_methods')) as CallToolSuccess
    const text = res.result.content[0]!.text
    expect(text).toMatch(/hello@example\.com/)
    expect(text).toMatch(/example\.com\/contact/)
  })
})

describe('tool dispatcher errors', () => {
  it('surfaces an isError response for unregistered tool names', async () => {
    // Empirically, McpServer returns a tool-level error (not a top-level
    // JSON-RPC error envelope) for unknown tool names — the response is shaped
    // as { result: { isError: true, content: [{ type: 'text', text: '...' }] } }
    // with message "MCP error -32602: Tool <name> not found". We assert that
    // shape here so a future change to a top-level { error: {...} } envelope
    // would fail loudly.
    const res = (await callTool('tool_that_does_not_exist')) as CallToolSuccess
    expect(res.result.isError).toBe(true)
    const text = res.result.content[0]!.text
    expect(text.toLowerCase()).toContain('not found')
    expect(text).toContain('tool_that_does_not_exist')
  })
})
