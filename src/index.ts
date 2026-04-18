import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createServer } from './server.js'

interface Env {
  MCP_RATE_LIMITER: RateLimit
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id',
  'Access-Control-Max-Age': '86400',
} as const

/**
 * Return a clone of `response` with CORS headers merged onto its existing
 * headers. We clone rather than mutate because Response headers from the SDK
 * transport may already be locked once the response has been constructed.
 */
function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    if (url.pathname !== '/mcp') {
      return new Response('Not Found', { status: 404, headers: CORS_HEADERS })
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { ...CORS_HEADERS, Allow: 'POST, OPTIONS' },
      })
    }

    try {
      const clientKey = request.headers.get('CF-Connecting-IP') ?? 'unknown'
      const { success } = await env.MCP_RATE_LIMITER.limit({ key: clientKey })
      if (!success) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32000,
              message:
                'Rate limit exceeded: 20 requests per 10 seconds per IP. Try again shortly.',
            },
          }),
          {
            status: 429,
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'application/json',
              'Retry-After': '10',
            },
          },
        )
      }

      const server = createServer()
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      })

      await server.connect(transport)
      const response = await transport.handleRequest(request)
      return withCors(response)
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err)
      const errName = err instanceof Error ? err.name : 'Unknown'
      console.error('mcp-server fetch error:', errName, '-', errMessage)
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32603, message: 'Internal error' },
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        },
      )
    }
  },
} satisfies ExportedHandler<Env>
