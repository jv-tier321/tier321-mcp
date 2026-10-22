import assert from 'node:assert/strict'
import { appendFileSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export function releasePlan({ ref, version, previousVersion, sha, dispatch = false }) {
  assert.match(sha, /^[0-9a-f]{40}$/)
  assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/)
  const tag = `v${version}`
  if (ref === 'refs/heads/main') {
    return { release: dispatch || previousVersion !== version, tag, sha }
  }
  assert.equal(ref, `refs/tags/${tag}`, 'Release tag must match package version')
  return { release: true, tag, sha }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  let previousVersion
  if (process.env.GITHUB_REF === 'refs/heads/main' && process.env.GITHUB_EVENT_NAME === 'push') {
    assert.match(event.before, /^[0-9a-f]{40}$/)
    assert.notEqual(event.before, '0'.repeat(40), 'Initial branch creation requires manual release dispatch')
    previousVersion = JSON.parse(execFileSync('git', ['show', `${event.before}:package.json`], { encoding: 'utf8' })).version
  }
  const plan = releasePlan({ ref: process.env.GITHUB_REF, version, previousVersion, sha,
    dispatch: process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' })
  for (const [key, value] of Object.entries(plan)) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`)
}
