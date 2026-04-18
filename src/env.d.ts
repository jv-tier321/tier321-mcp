/// <reference types="@cloudflare/workers-types" />

// Wrangler `rules: [{ type: "Text", globs: ["**/*.mdx", "**/*.md"] }]` bundles
// these as raw strings; declare the module shape so TypeScript accepts the
// default-import syntax used by the blog loader.
declare module '*.mdx' {
  const content: string
  export default content
}

declare module '*.md' {
  const content: string
  export default content
}
