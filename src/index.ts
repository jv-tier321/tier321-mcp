import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createServer } from './server.js'
import { readMessage, RequestError } from './lib/request.js'

function responseHeaders(origin: string | null): Headers {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version',
    'Access-Control-Expose-Headers': 'Retry-After',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  })
  if (origin) headers.set('Access-Control-Allow-Origin', origin)
  return headers
}

function errorResponse(status: number, code: number, message: string, headers: Headers): Response {
  return Response.json({ jsonrpc: '2.0', id: null, error: { code, message } }, { status, headers })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin')
    const allowedOrigins = env.MCP_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    // Native clients omit Origin. Browser access requires an explicit exact origin.
    const validOrigin = origin === null || allowedOrigins.some((allowed) => {
      try {
        const url = new URL(allowed)
        return ['http:', 'https:'].includes(url.protocol) && url.origin === allowed && allowed === origin
      } catch { return false }
    })
    const headers = responseHeaders(validOrigin ? origin : null)
    if (!validOrigin) return errorResponse(403, -32000, 'Origin not allowed', headers)
    if (new URL(request.url).pathname !== '/mcp') return new Response('Not Found', { status: 404, headers })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') {
      headers.set('Allow', 'POST, OPTIONS')
      return new Response('Method Not Allowed', { status: 405, headers })
    }
    try {
      const clientKey = request.headers.get('CF-Connecting-IP') ?? 'unknown'
      const { success } = await env.MCP_RATE_LIMITER.limit({ key: clientKey })
      if (!success) {
        headers.set('Retry-After', '10')
        return errorResponse(429, -32000, 'Rate limit exceeded. Try again shortly.', headers)
      }
      const contentType = request.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase()
      if (contentType !== 'application/json') return errorResponse(415, -32000, 'Content-Type must be application/json', headers)
      if (request.headers.has('Content-Encoding')) return errorResponse(415, -32000, 'Content-Encoding is not supported', headers)
      const parsedBody = await readMessage(request)
      const server = createServer()
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      })
      try {
        await server.connect(transport)
        const response = await transport.handleRequest(request, { parsedBody })
        const merged = new Headers(response.headers)
        headers.forEach((value, key) => merged.set(key, value))
        return new Response(response.body, { status: response.status, headers: merged })
      } finally {
        // JSON responses are complete before handleRequest resolves; no SSE/session persists.
        await server.close()
      }
    } catch (error) {
      if (error instanceof RequestError) return errorResponse(error.status, error.code, error.message, headers)
      console.error('mcp_request_failed')
      return errorResponse(500, -32603, 'Internal error', headers)
    }
  },
} satisfies ExportedHandler<Env>
