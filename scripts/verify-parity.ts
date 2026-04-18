// Shape-only verification for the reference implementation.
//
// In a production deployment, this script would compare the subproject's
// data files against an upstream source of truth. That cross-repo pattern
// is not useful in the public reference implementation, so the public
// version only asserts that each data file:
//   - has the expected count of entries
//   - has all required fields present on every entry
//
// Shape definitions live in scripts/fixtures/expected-shape.json. Update
// that file if you change the count or fields (and update the matching
// test assertions in test/tools.test.ts).

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { products } from '../src/data/products.js'
import { industries } from '../src/data/industries.js'
import { useCases } from '../src/data/use-cases.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface ShapeEntry {
  count: number
  requiredFields: string[]
}
interface Shape {
  products: ShapeEntry
  industries: ShapeEntry
  useCases: ShapeEntry
}

const shape: Shape = JSON.parse(
  readFileSync(resolve(__dirname, 'fixtures', 'expected-shape.json'), 'utf-8'),
)

type Failure = { area: string; detail: string }
const failures: Failure[] = []

function checkShape<T extends Record<string, unknown>>(
  area: string,
  entries: T[],
  expected: ShapeEntry,
): void {
  if (entries.length !== expected.count) {
    failures.push({
      area,
      detail: `Count mismatch: expected ${expected.count}, found ${entries.length}`,
    })
    return
  }
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!
    const missing = expected.requiredFields.filter((f) => !(f in entry))
    if (missing.length > 0) {
      failures.push({
        area,
        detail: `Entry ${i} missing required fields: ${missing.join(', ')}`,
      })
    }
  }
  if (failures.filter((f) => f.area === area).length === 0) {
    console.log(`Shape OK — ${area}: ${entries.length} entries, ${expected.requiredFields.length} fields checked per entry`)
  }
}

checkShape('products', products as unknown as Record<string, unknown>[], shape.products)
checkShape('industries', industries as unknown as Record<string, unknown>[], shape.industries)
checkShape('useCases', useCases as unknown as Record<string, unknown>[], shape.useCases)

if (failures.length > 0) {
  console.error('\n✗ Shape-check failures:')
  for (const f of failures) {
    console.error(`  [${f.area}] ${f.detail}`)
  }
  process.exit(1)
}

console.log('\n✓ All shape checks passed')
