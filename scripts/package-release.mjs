import { readFileSync, readdirSync, mkdirSync, copyFileSync, writeFileSync, lstatSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import './verify-release.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const { version } = JSON.parse(readFileSync(join(root, 'package.json')))
const output = join(root, 'release')
const staging = join(root, '.release-staging')
rmSync(output, { recursive: true, force: true })
rmSync(staging, { recursive: true, force: true })
mkdirSync(output)
mkdirSync(staging)
try {
  const files = readdirSync(join(root, 'dist'))
  assert.ok(files.includes('index.js'), 'Build the Worker first')
  for (const name of files) {
    assert.match(name, /^[a-zA-Z0-9_.-]+$/, 'Unexpected build filename')
    const source = join(root, 'dist', name)
    assert.ok(lstatSync(source).isFile(), 'Only regular build files may be released')
    if (name.endsWith('.map') || name === 'README.md') continue
    assert.match(name, /\.(js|mdx|md)$/, 'Unexpected build artifact type')
    const text = readFileSync(source, 'utf8')
    assert.ok(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text), 'Private key material in build')
    copyFileSync(source, join(staging, name))
  }
  for (const name of ['LICENSE', 'NOTICE']) copyFileSync(join(root, name), join(staging, name))
  writeFileSync(join(staging, 'VERSION'), `${version}\n`)
  const filename = `tier321-mcp-${version}.tar.gz`
  execFileSync('tar', ['-czf', resolve(output, filename), '-C', staging, '.'])
  const hash = createHash('sha256').update(readFileSync(join(output, filename))).digest('hex')
  writeFileSync(join(output, 'SHA256SUMS'), `${hash}  ${filename}\n`)
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
  const entry = changelog.split(`## [${version}] - `)[1].split('\n## [')[0]
  writeFileSync(join(output, 'RELEASE_NOTES.md'), `Release ${version} — ${entry}\n\nThis is the public reference implementation. No Cloudflare deployment is performed. The archive contains the Worker bundle and bundled placeholder data; source maps are excluded.\n`)
  console.log(`Packaged ${filename} with SHA-256 checksum`)
} finally { rmSync(staging, { recursive: true, force: true }) }
