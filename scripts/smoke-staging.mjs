import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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
if (flags.includes('--check-rate-limit')) {
  // One bounded, sequential probe on this staging Worker, then a recovery check.
  await pause(11_000)
  let limited = false
  for (let attempt = 1; attempt <= 30; attempt++) {
    const response = await boundedFetch(endpoint, { method: 'POST', headers, body: ping }, false)
    await response.arrayBuffer()
    if (response.status === 429) {
      assert.equal(response.headers.get('retry-after'), '10')
      rateLimit = `429 observed on probe request ${attempt}`
      limited = true
      break
    }
    assert.equal(response.status, 200, 'rate probe ping')
  }
  assert.ok(limited, 'No 429 observed within 30 requests; counters are eventually consistent, investigate without increasing load')
  pass('rate limit and Retry-After')
  await pause(11_000)
  await check('recovery after rate window', 200, { method: 'POST', headers, body: ping })
}
console.log(JSON.stringify({ timestamp: new Date().toISOString(), endpoint: endpoint.href, version, requests, passed, rateLimit }, null, 2))
