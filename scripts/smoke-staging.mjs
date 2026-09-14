import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { connect as connectHttp2 } from 'node:http2'
import { setTimeout as pause } from 'node:timers/promises'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

// This intentionally cannot target production, custom domains or arbitrary URLs.
const [target, ...flags] = process.argv.slice(2)
assert.ok(target, 'Usage: npm run smoke:staging -- https://tier321-mcp-staging.<subdomain>.workers.dev/mcp [--check-rate-limit]')
assert.ok(flags.length <= 1 && flags.every((flag) => flag === '--check-rate-limit'), 'Unknown or duplicate flag')
const endpoint = new URL(target)
assert.ok(
  endpoint.protocol === 'https:' &&
  /^tier321-mcp-staging\.[a-z0-9-]+\.workers\.dev$/.test(endpoint.hostname) &&
  !endpoint.port && !endpoint.username && !endpoint.password &&
  endpoint.pathname === '/mcp' && !endpoint.search && !endpoint.hash,
  'Only the dedicated tier321-mcp-staging workers.dev endpoint is permitted',
)
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const passed = []
let requests = 0
function securityHeaders(response) {
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.ok(response.headers.get('vary')?.split(',').some((value) => value.trim().toLowerCase() === 'origin'))
  assert.equal(response.headers.get('access-control-allow-origin'), null)
}
async function boundedFetch(input, init = {}, paced = true) {
  if (paced) await pause(750)
  requests++
  const signal = init.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)])
    : AbortSignal.timeout(15_000)
  const response = await fetch(input, { ...init, redirect: 'error', signal })
  securityHeaders(response)
  return response
}
function pass(name) {
  passed.push(name)
  console.log(`PASS ${name}`)
}
const toolArguments = {
  get_company_info: {},
  list_products: {},
  get_product: { id: 'alpha-platform' },
  list_blog_posts: {},
  get_blog_post: { slug: 'welcome-to-example' },
  list_industries: {},
  list_use_cases: {},
  get_contact_methods: {},
}
const client = new Client({ name: 'tier321-staging-smoke', version: '1.0.0' })
try {
  await client.connect(new StreamableHTTPClientTransport(endpoint, { fetch: boundedFetch }))
  assert.equal(client.getServerVersion()?.version, version)
  pass(`initialize ${version}`)
  const { tools } = await client.listTools()
  assert.deepEqual(tools.map((tool) => tool.name).sort(), Object.keys(toolArguments).sort())
  for (const tool of tools) {
    assert.deepEqual(tool.annotations, {
      readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false,
    })
    const result = await client.callTool({ name: tool.name, arguments: toolArguments[tool.name] })
    assert.ok(!result.isError, tool.name)
    assert.ok(result.content?.some((item) => item.type === 'text' && item.text.length > 0), tool.name)
    pass(tool.name)
  }
  const invalid = await client.callTool({ name: 'get_product', arguments: { id: 'x'.repeat(129) } })
  assert.equal(invalid.isError, true)
  pass('tool argument bound')
} finally {
  await client.close()
}

const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
const ping = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' })
async function check(name, expected, init, path = '/mcp') {
  const response = await boundedFetch(new URL(path, endpoint), init)
  assert.equal(response.status, expected, name)
  if (expected === 405) assert.equal(response.headers.get('allow'), 'POST, OPTIONS')
  // Drain without logging any response content.
  await response.arrayBuffer()
  pass(name)
}
for (const method of ['GET', 'DELETE', 'PUT']) {
  await check(`${method} rejected`, 405, { method })
}
await check('unknown route', 404, { method: 'GET' }, '/not-a-route')
await check('native OPTIONS', 204, { method: 'OPTIONS' })
for (const origin of ['https://untrusted.example', 'null']) {
  await check(`browser origin rejected (${origin})`, 403, {
    method: 'POST', headers: { ...headers, Origin: origin }, body: ping,
  })
}
await check('browser preflight rejected', 403, {
  method: 'OPTIONS', headers: { Origin: 'https://untrusted.example', 'Access-Control-Request-Method': 'POST' },
})
await check('media type rejected', 415, { method: 'POST', headers: { ...headers, 'Content-Type': 'text/plain' }, body: ping })
await check('encoding rejected', 415, { method: 'POST', headers: { ...headers, 'Content-Encoding': 'identity' }, body: ping })
await check('malformed JSON', 400, { method: 'POST', headers, body: '{' })
await check('invalid UTF-8', 400, { method: 'POST', headers, body: new Uint8Array([0xff]) })
await check('batch rejected', 400, { method: 'POST', headers, body: `[${ping}]` })
await check('primitive rejected', 400, { method: 'POST', headers, body: 'null' })
await check('body size bound', 413, { method: 'POST', headers, body: 'x'.repeat(16 * 1024 + 1) })
await check('JSON depth bound', 400, {
  method: 'POST', headers, body: '{"x":'.repeat(33) + '0' + '}'.repeat(33),
})

let rateLimit = 'not requested'
let rateProbe
if (flags.includes('--check-rate-limit')) {
  // Keep the probe inside a ten-second window despite network latency. At most
  // three requests are in flight and at most thirty are sent; never retry it.
  await pause(11_000)
  await pause((10_000 - Date.now() % 10_000) % 10_000)
  let limited = false
  const started = performance.now()
  const locations = new Map()
  let sent = 0
  // One TLS-verified connection avoids distributing the probe across locations.
  // HTTP/2 multiplexing bounds elapsed time without opening extra connections.
  const session = connectHttp2(endpoint.origin)
  session.on('error', () => {}) // connection/stream promises report failures below
  function probePing() {
    sent++
    requests++
    return new Promise((resolve, reject) => {
      const stream = session.request({
        ':method': 'POST', ':path': endpoint.pathname,
        'content-type': headers['Content-Type'], accept: headers.Accept,
      })
      let responseHeaders
      stream.setTimeout(15_000, () => stream.destroy(new Error('Rate probe request timed out')))
      stream.once('response', (value) => { responseHeaders = value })
      stream.on('data', () => {})
      stream.once('error', reject)
      stream.once('end', () => {
        try {
          assert.ok(responseHeaders, 'Rate probe response headers missing')
          const response = new Response(null, {
            status: Number(responseHeaders[':status']),
            headers: Object.fromEntries(Object.entries(responseHeaders).filter(([key]) => !key.startsWith(':'))),
          })
          securityHeaders(response)
          resolve(response)
        } catch (error) { reject(error) }
      })
      stream.end(ping)
    })
  }
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => session.destroy(new Error('Rate probe connection timed out')), 15_000)
      session.once('connect', () => { clearTimeout(timer); resolve() })
      session.once('error', (error) => { clearTimeout(timer); reject(error) })
    })
    for (let batch = 0; batch < 10 && !limited; batch++) {
      const responses = await Promise.all(Array.from({ length: 3 }, probePing))
      for (const response of responses) {
        const location = response.headers.get('cf-ray')?.split('-').at(-1) ?? 'unknown'
        locations.set(location, (locations.get(location) ?? 0) + 1)
        if (response.status === 429) {
          assert.equal(response.headers.get('retry-after'), '10')
          limited = true
        } else {
          assert.equal(response.status, 200, 'rate probe ping')
        }
      }
      if (!limited) await pause(100)
    }
  } finally {
    session.destroy()
  }
  rateProbe = { requests: sent, elapsedMs: Math.round(performance.now() - started), locations: Object.fromEntries(locations), maxConcurrent: 3, transport: 'single HTTP/2 connection' }
  rateLimit = limited ? `429 observed within ${sent} probe requests` : 'not observed within bounded probe'
  console.log(JSON.stringify({ rateLimit, rateProbe }))
  if (limited) pass('rate limit and Retry-After')
  await pause(11_000)
  await check(limited ? 'recovery after rate window' : 'availability after probe', 200, { method: 'POST', headers, body: ping })
  assert.ok(limited, 'No 429 observed within 30 requests; counters are eventually consistent, investigate without increasing load')
}
console.log(JSON.stringify({ timestamp: new Date().toISOString(), endpoint: endpoint.href, version, requests, passed, rateLimit, rateProbe }, null, 2))
