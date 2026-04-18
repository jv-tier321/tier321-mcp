import { describe, it, expect } from 'vitest'
import { SELF } from 'cloudflare:test'

let nextId = 1

describe('MCP server transport', () => {
  it('responds to tools/list with a valid JSON-RPC envelope', async () => {
    const requestId = nextId++
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/list',
      params: {},
    })

    const res = await SELF.fetch('http://example.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body,
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({ jsonrpc: '2.0', id: requestId })
  })

  it('advertises registered tools in tools/list', async () => {
    const res = await SELF.fetch('http://example.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: nextId++,
        method: 'tools/list',
        params: {},
      }),
    })
    const json = (await res.json()) as { result: { tools: Array<{ name: string }> } }
    const toolNames = json.result.tools.map((t) => t.name)
    expect(toolNames).toContain('get_company_info')
    expect(toolNames).toContain('list_products')
    expect(toolNames).toContain('get_product')
    expect(toolNames).toContain('list_blog_posts')
    expect(toolNames).toContain('get_blog_post')
    expect(toolNames).toContain('list_industries')
    expect(toolNames).toContain('list_use_cases')
    expect(toolNames).toContain('get_contact_methods')
  })

  it('successful POST responses carry CORS headers', async () => {
    const res = await SELF.fetch('http://example.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: nextId++,
        method: 'tools/list',
        params: {},
      }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

describe('CORS', () => {
  it('responds to OPTIONS preflight with 204', async () => {
    const res = await SELF.fetch('http://example.com/mcp', { method: 'OPTIONS' })
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('returns 405 for GET /mcp', async () => {
    const res = await SELF.fetch('http://example.com/mcp', { method: 'GET' })
    expect(res.status).toBe(405)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Allow')).toBe('POST, OPTIONS')
  })

  it('returns 404 for non-/mcp paths with CORS headers', async () => {
    const res = await SELF.fetch('http://example.com/other', { method: 'POST' })
    expect(res.status).toBe(404)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

describe('Rate limiting', () => {
  it('returns 429 with JSON-RPC envelope when an IP exceeds 20 req / 10s', async () => {
    const ip = '203.0.113.42' // TEST-NET-3 docs IP so we never collide with real test traffic
    const responses: Response[] = []
    for (let i = 0; i < 25; i++) {
      const res = await SELF.fetch('http://example.com/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'CF-Connecting-IP': ip,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: nextId++,
          method: 'tools/list',
          params: {},
        }),
      })
      responses.push(res)
    }

    const statuses = responses.map((r) => r.status)
    expect(statuses.filter((s) => s === 200).length).toBeGreaterThan(0)
    const limited = responses.find((r) => r.status === 429)
    expect(limited).toBeDefined()
    expect(limited!.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(limited!.headers.get('Retry-After')).toBe('10')
    const envelope = (await limited!.json()) as {
      jsonrpc: string
      id: null
      error: { code: number; message: string }
    }
    expect(envelope.jsonrpc).toBe('2.0')
    expect(envelope.id).toBeNull()
    expect(envelope.error.code).toBe(-32000)
    expect(envelope.error.message.toLowerCase()).toContain('rate limit')
  })

  it('does not rate-limit different IPs against each other', async () => {
    const ipA = '203.0.113.10'
    const ipB = '203.0.113.20'
    const hit = async (ip: string): Promise<number> => {
      const res = await SELF.fetch('http://example.com/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'CF-Connecting-IP': ip,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: nextId++,
          method: 'tools/list',
          params: {},
        }),
      })
      return res.status
    }

    // Burn through A's budget
    for (let i = 0; i < 21; i++) await hit(ipA)
    // B should still be clean
    expect(await hit(ipB)).toBe(200)
  })
})
