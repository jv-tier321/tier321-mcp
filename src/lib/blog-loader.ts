// Blog post loader for the MCP server. MDX files are imported as raw strings
// via Wrangler's Text rule (see wrangler.jsonc + src/env.d.ts). The blog posts
// here are placeholders in the reference implementation — fork and replace
// with your own MDX files under src/data/blog/.
import welcomeToExample from '../data/blog/welcome-to-example.mdx'
import secondPost from '../data/blog/second-post.mdx'

interface BundledPost {
  slug: string
  raw: string
}

const BUNDLED: BundledPost[] = [
  { slug: 'welcome-to-example', raw: welcomeToExample },
  { slug: 'second-post', raw: secondPost },
]

export interface BlogPostMeta {
  slug: string
  title: string
  description: string
  date: string
  author: string
  tags: string[]
  featured: boolean
}

export interface BlogPost extends BlogPostMeta {
  content: string
}

function stripQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value[0]
    const last = value[value.length - 1]
    if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
      return value.slice(1, -1)
    }
  }
  return value
}

function parseFrontmatter(raw: string): { meta: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }
  const meta: Record<string, unknown> = {}
  for (const line of match[1]!.split('\n')) {
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const key = line.slice(0, colon).trim()
    let value = line.slice(colon + 1).trim()
    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
      continue
    }
    value = stripQuotes(value)
    if (value === 'true') {
      meta[key] = true
      continue
    }
    if (value === 'false') {
      meta[key] = false
      continue
    }
    meta[key] = value
  }
  return { meta, body: match[2]!.trimStart() }
}

function toPost(bundle: BundledPost): BlogPost {
  const { meta, body } = parseFrontmatter(bundle.raw)
  return {
    slug: bundle.slug,
    title: String(meta.title ?? ''),
    description: String(meta.description ?? ''),
    date: String(meta.date ?? ''),
    author: String(meta.author ?? ''),
    tags: Array.isArray(meta.tags) ? (meta.tags as string[]) : [],
    featured: meta.featured === true,
    content: body,
  }
}

export function listBlogPosts(): BlogPostMeta[] {
  return BUNDLED.map(toPost)
    .map(({ content: _content, ...meta }) => meta)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getBlogPost(slug: string): BlogPost | null {
  const found = BUNDLED.find((b) => b.slug === slug)
  return found ? toPost(found) : null
}
