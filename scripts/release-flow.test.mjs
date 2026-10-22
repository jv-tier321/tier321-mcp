import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { releasePlan } from './release-plan.mjs'

const sha = 'a'.repeat(40)
const tag = 'v0.2.1'
const workflow = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')
const guard = workflow.split('// BEGIN TESTED PUBLICATION GUARD\n')[1].split('// END TESTED PUBLICATION GUARD')[0]
const ensureTag = new Function('assert', `${guard}\nreturn ensureTag`)(assert)

test('only a reviewed main version change, explicit main retry, or matching version tag requests release', () => {
  const base = { version: '0.2.1', previousVersion: '0.2.0', sha, ref: 'refs/heads/main' }
  assert.deepEqual(releasePlan(base), { release: true, tag, sha })
  assert.equal(releasePlan({ ...base, previousVersion: '0.2.1' }).release, false)
  assert.equal(releasePlan({ ...base, previousVersion: '0.2.1', dispatch: true }).release, true)
  assert.equal(releasePlan({ ...base, ref: `refs/tags/${tag}` }).release, true)
  for (const change of [{ ref: 'refs/heads/feature' }, { ref: 'refs/tags/v0.2.0' },
    { version: '0.2.1\nrelease=true' }, { version: '01.2.3' }, { sha: 'main' }]) {
    assert.throws(() => releasePlan({ ...base, ...change }))
  }
})

function fixture({ object, release = null, annotated } = {}) {
  const writes = []
  let ref = object ? { object } : null
  const api = async (path, body) => {
    if (body) {
      assert.equal(path, '/git/refs')
      assert.deepEqual(JSON.parse(JSON.stringify(body)), { ref: `refs/tags/${tag}`, sha })
      writes.push(body)
      ref = { object: { type: 'commit', sha: body.sha } }
      return ref
    }
    if (path === `/git/ref/tags/${tag}`) return ref
    if (path === `/releases/tags/${tag}`) return release
    if (path.startsWith('/git/tags/')) return { object: annotated }
    throw new Error(`Unexpected path ${path}`)
  }
  return { api, writes }
}

test('automatic publication creates only the exact tested tag and recovers an orphan tag', async () => {
  const fresh = fixture()
  assert.equal(await ensureTag(fresh.api, tag, sha), false)
  assert.equal(fresh.writes.length, 1)
  assert.equal(await ensureTag(fresh.api, tag, sha), false)
  assert.equal(fresh.writes.length, 1)
  const annotated = fixture({ object: { type: 'tag', sha: 'b'.repeat(40) }, annotated: { type: 'commit', sha } })
  assert.equal(await ensureTag(annotated.api, tag, sha), false)
  assert.equal(annotated.writes.length, 0)
})

test('mismatched, noncommit and unpeelable tags fail without modifying refs', async () => {
  for (const object of [{ type: 'commit', sha: 'b'.repeat(40) }, { type: 'tree', sha }, { type: 'tag', sha }]) {
    const f = fixture({ object, annotated: object })
    await assert.rejects(ensureTag(f.api, tag, sha))
    assert.equal(f.writes.length, 0)
  }
  await assert.rejects(ensureTag(async () => { throw new Error('API unavailable') }, tag, sha), /API unavailable/)
})

test('complete published releases are idempotent without comparing nondeterministic rebuilt archives', async () => {
  const assets = ['tier321-mcp-0.2.1.tar.gz', 'SHA256SUMS'].map(name => ({ name, state: 'uploaded', size: 100, digest: `sha256:${'f'.repeat(64)}` }))
  const release = { tag_name: tag, draft: false, prerelease: false, assets }
  const f = fixture({ object: { type: 'commit', sha }, release })
  assert.equal(await ensureTag(f.api, tag, sha), true)
  assert.equal(f.writes.length, 0)
  for (const change of [{ draft: true }, { prerelease: true }, { assets: [] },
    { assets: assets.map(a => ({ ...a, digest: null })) }, { assets: assets.map(a => ({ ...a, state: 'new' })) }]) {
    const invalid = fixture({ object: { type: 'commit', sha }, release: { ...release, ...change } })
    await assert.rejects(ensureTag(invalid.api, tag, sha))
    assert.equal(invalid.writes.length, 0)
  }
})

test('workflow retains read-only tested build and checkout-free publishing, serialized by version', () => {
  const publish = workflow.split('\n  publish:')[1]
  assert.match(publish, /needs: \[plan, build\]/)
  assert.match(publish, /group: release-\$\{\{ needs\.plan\.outputs\.tag \}\}/)
  assert.doesNotMatch(publish, /actions\/checkout|npm (?:ci|install|run)|wrangler|--clobber/)
  assert.match(publish, /RELEASE_SHA: \$\{\{ needs\.plan\.outputs\.sha \}\}/)
  assert.match(publish, /gh release create.*--verify-tag/)
  assert.match(workflow, /branches: \[main\]/)
  assert.match(workflow, /git merge-base --is-ancestor HEAD origin\/main/)
  assert.equal((workflow.match(/contents: write/g) || []).length, 1)
})
