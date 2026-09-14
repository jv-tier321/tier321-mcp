import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from '../src/index.js'
import { readMessage, MAX_REQUEST_BYTES } from '../src/lib/request.js'
import { version } from '../package.json'

const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
const env = (origins = ''): Env => ({ MCP_ALLOWED_ORIGINS: origins, MCP_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) } })
function request(body: unknown, extra: Record<string, string> = {}) {
  return new Request('https://example.com/mcp', { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(body) })
}
const list = { jsonrpc: '2.0', id: 1, method: 'tools/list' }
afterEach(() => vi.restoreAllMocks())

describe('public admission controls', () => {
  it.each([[], [list], [list, { ...list, id: 2 }], null, 1])('rejects non-message payload %j', async (body) => {
    const res = await worker.fetch(request(body), env())
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: { code: -32600 } })
  })
  it('bounds actual streamed bytes with a misleading length and cancels the stream', async () => {
    let canceled = false
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(4096)) },
      cancel() { canceled = true },
    })
    const req = new Request('https://example.com/mcp', { method: 'POST', headers: { ...headers, 'Content-Length': '1' }, body: stream })
    expect((await worker.fetch(req, env())).status).toBe(413)
    expect(canceled).toBe(true)
  })
  it('rejects advertised oversized bodies before pulling', async () => {
    const res = await worker.fetch(request(list, { 'Content-Length': String(MAX_REQUEST_BYTES + 1) }), env())
    expect(res.status).toBe(413)
  })
  it('accepts a message at the byte boundary and rejects one byte more', async () => {
    const small = JSON.stringify(list)
    const body = small + ' '.repeat(MAX_REQUEST_BYTES - small.length)
    const make = (text: string) => new Request('https://example.com/mcp', { method: 'POST', headers, body: text })
    expect((await worker.fetch(make(body), env())).status).toBe(200)
    expect((await worker.fetch(make(body + ' '), env())).status).toBe(413)
  })
  it('rejects deeply nested metadata', async () => {
    let deep: unknown = 'x'
    for (let i = 0; i < 40; i++) deep = { nested: deep }
    expect((await worker.fetch(request({ ...list, params: deep }), env())).status).toBe(400)
  })
  it.each(['{', '', '{"x":'])('rejects malformed JSON without reflecting it', async (body) => {
    const res = await worker.fetch(new Request('https://example.com/mcp', { method: 'POST', headers, body }), env())
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: { code: -32700, message: 'Invalid JSON' } })
  })
  it('times out a body that never completes', async () => {
    vi.useFakeTimers()
    try {
      const body = new ReadableStream<Uint8Array>({ start() {} })
      const result = readMessage(new Request('https://example.com/mcp', { method: 'POST', body }))
      const assertion = expect(result).rejects.toMatchObject({ status: 408 })
      await vi.advanceTimersByTimeAsync(5001)
      await assertion
    } finally { vi.useRealTimers() }
  })
  it.each(['null', 'https://evil.example', 'https://example.com.evil.test', 'https://example.com/'])('denies unapproved Origin %s', async (origin) => {
    const res = await worker.fetch(request(list, { Origin: origin }), env('https://example.com'))
    expect(res.status).toBe(403)
    expect(res.headers.has('Access-Control-Allow-Origin')).toBe(false)
  })
  it('allows an exact configured browser origin with no credentials', async () => {
    const res = await worker.fetch(request(list, { Origin: 'https://client.example' }), env('https://client.example'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://client.example')
    expect(res.headers.has('Access-Control-Allow-Credentials')).toBe(false)
    expect(res.headers.get('Vary')).toBe('Origin')
  })
  it('checks Origin on preflight too', async () => {
    const res = await worker.fetch(new Request('https://example.com/mcp', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), env())
    expect(res.status).toBe(403)
  })
  it.each<Record<string, string>>([{ 'Content-Type': 'text/plain' }, { 'Content-Encoding': 'gzip' }])('rejects unsupported media', async (extra) => {
    expect((await worker.fetch(request(list, extra), env())).status).toBe(415)
  })
  it('fails closed and sanitizes limiter exceptions', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const bindings = env()
    bindings.MCP_RATE_LIMITER.limit = async () => { throw new Error('private-token-fixture') }
    const res = await worker.fetch(request(list), bindings)
    expect(res.status).toBe(500)
    expect(await res.text()).not.toContain('private-token-fixture')
    expect(log).toHaveBeenCalledWith('mcp_request_failed')
  })
  it('adds no-store and nosniff to success and error responses', async () => {
    for (const body of [list, []]) {
      const res = await worker.fetch(request(body), env())
      expect(res.headers.get('Cache-Control')).toBe('no-store')
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    }
  })
})

describe('MCP lifecycle and tool contracts', () => {
  it('initializes with the release version, without allocating a session', async () => {
    const res = await worker.fetch(request({ jsonrpc: '2.0', id: 5, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } } }), env())
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ result: { protocolVersion: '2025-11-25', serverInfo: { version } } })
    expect(res.headers.has('Mcp-Session-Id')).toBe(false)
  })
  it('accepts initialized notifications with 202', async () => {
    const res = await worker.fetch(request({ jsonrpc: '2.0', method: 'notifications/initialized' }), env())
    expect(res.status).toBe(202)
    expect(await res.text()).toBe('')
  })
  it('rejects unsupported protocol versions and missing Accept', async () => {
    expect((await worker.fetch(request(list, { 'MCP-Protocol-Version': '1900-01-01' }), env())).status).toBe(400)
    expect((await worker.fetch(request(list, { Accept: 'application/json' }), env())).status).toBe(406)
  })
  it('advertises exactly eight explicitly read-only tools', async () => {
    const res = await worker.fetch(request(list), env())
    const data = await res.json() as { result: { tools: Array<{ annotations: Record<string, boolean> }> } }
    expect(data.result.tools).toHaveLength(8)
    for (const tool of data.result.tools) expect(tool.annotations).toEqual({ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false })
  })
  it.each([
    ['get_product', { id: 12 }], ['get_product', { id: '' }], ['get_product', { id: 'x'.repeat(129) }],
    ['get_blog_post', { slug: 'x'.repeat(129) }], ['list_products', { status: ['invalid'] }],
    ['list_products', { status: Array(5).fill('shipped') }],
  ])('validates bounded arguments for %s', async (name, args) => {
    const res = await worker.fetch(request({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }), env())
    expect(await res.json()).toMatchObject({ result: { isError: true } })
  })
})
