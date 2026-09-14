import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)))
assert.match(pkg.version, /^\d+\.\d+\.\d+$/)
assert.equal(lock.version, pkg.version)
assert.equal(lock.packages[''].version, pkg.version)
if (process.env.RELEASE_TAG) assert.equal(process.env.RELEASE_TAG, `v${pkg.version}`)
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8')
assert.ok(changelog.includes(`## [${pkg.version}] - `), 'Missing current changelog entry')
console.log(`Release metadata OK: v${pkg.version}`)
