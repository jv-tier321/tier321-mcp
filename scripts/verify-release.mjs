import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { unstable_readConfig as readWorkerConfig } from 'wrangler'

// Review these public example identities alongside any intentional config change.
// Parse with the locked Wrangler version so JSONC and environment inheritance
// have the same meaning here as they do in a dry-run build.
const config = fileURLToPath(new URL('../wrangler.jsonc', import.meta.url))
const environments = [
  { env: '', name: 'tier321-mcp-example', namespace: '32102000' },
  { env: 'staging', name: 'tier321-mcp-staging', namespace: '32102001' },
]
const names = new Set()
const namespaces = new Set()
for (const expected of environments) {
  const worker = readWorkerConfig({ config, env: expected.env }, { hideWarnings: true })
  assert.equal(worker.name, expected.name, 'Review the deployment target before release')
  assert.equal(worker.workers_dev, true, 'Example access must be explicit')
  assert.equal(worker.preview_urls, false, 'Version preview URLs must remain disabled')
  assert.deepEqual(worker.routes, [], 'Public examples must not carry custom routes')
  assert.equal(worker.observability.redact_query_string, true, 'Request query strings must be redacted from telemetry')
  assert.equal(worker.ratelimits.length, 1, 'Expected one public example rate limiter')
  const limiter = worker.ratelimits[0]
  assert.equal(limiter.name, 'MCP_RATE_LIMITER')
  assert.equal(limiter.namespace_id, expected.namespace, 'Review the limiter namespace before release')
  assert.ok(!names.has(worker.name), 'Worker environments must use distinct names')
  assert.ok(!namespaces.has(limiter.namespace_id), 'Worker environments must use distinct limiter namespaces')
  names.add(worker.name)
  namespaces.add(limiter.namespace_id)
}
console.log('Deployment configuration OK: isolated default and staging examples')

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)))
assert.match(pkg.version, /^\d+\.\d+\.\d+$/)
assert.equal(lock.version, pkg.version)
assert.equal(lock.packages[''].version, pkg.version)
if (process.env.RELEASE_TAG) assert.equal(process.env.RELEASE_TAG, `v${pkg.version}`)
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8')
assert.ok(changelog.includes(`## [${pkg.version}] - `), 'Missing current changelog entry')
console.log(`Release metadata OK: v${pkg.version}`)
