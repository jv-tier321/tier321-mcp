// Example Corp industry catalog — placeholder data for the tier321-mcp
// reference implementation. Mirrors the shape of the production deployment
// but uses Greek-letter category names so nothing in this file fingerprints
// a real customer roster.
//
// The test suite enforces a count of 8 (list_industries > returns the 8
// industries). If you fork this repo and want a different count, update
// that test assertion to match.

export interface Industry {
  slug: string
  name: string
  description: string
}

export const industries: Industry[] = [
  {
    slug: 'industry-alpha',
    name: 'Industry Alpha',
    description:
      'Placeholder description for the first example industry. Real deployments replace this with a real-world sector the platform serves.',
  },
  {
    slug: 'industry-beta',
    name: 'Industry Beta',
    description:
      'Placeholder description for the second example industry. The shape is what matters for downstream consumers — the string is illustrative.',
  },
  {
    slug: 'industry-gamma',
    name: 'Industry Gamma',
    description: 'Placeholder description for the third example industry.',
  },
  {
    slug: 'industry-delta',
    name: 'Industry Delta',
    description: 'Placeholder description for the fourth example industry.',
  },
  {
    slug: 'industry-epsilon',
    name: 'Industry Epsilon',
    description: 'Placeholder description for the fifth example industry.',
  },
  {
    slug: 'industry-zeta',
    name: 'Industry Zeta',
    description: 'Placeholder description for the sixth example industry.',
  },
  {
    slug: 'industry-eta',
    name: 'Industry Eta',
    description: 'Placeholder description for the seventh example industry.',
  },
  {
    slug: 'industry-theta',
    name: 'Industry Theta',
    description: 'Placeholder description for the eighth example industry.',
  },
]
