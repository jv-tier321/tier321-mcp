# Contributing to tier321-mcp

Thanks for taking an interest. This document covers setup, the PR process, and conventions. Security issues have their own flow — see `SECURITY.md`.

## Prerequisites

- Node.js 20.x or 22.x
- npm (ships with Node)
- A Cloudflare account is only needed if you want to deploy — tests and typecheck run offline.

## Setup

```bash
git clone https://github.com/jv-tier321/tier321-mcp.git
cd tier321-mcp
npm install
```

## Development loop

```bash
npm test                     # miniflare-backed vitest, no Cloudflare account needed
npm run typecheck            # tsc --noEmit
npm run verify:parity        # shape-check the bundled data
npm run dev                  # local Wrangler dev server at http://localhost:8787
```

For a production build check without deploying:

```bash
npx wrangler deploy --dry-run --outdir=./dist
```

## Adding a tool

The tool-registration pattern lives in `src/tools/`. One file per logical domain (`blog.ts`, `company.ts`, etc.). Follow this sequence:

1. **Write the failing test first** in `test/tools.test.ts` using the `callTool()` helper.
2. **Implement** in a new or existing `src/tools/<name>.ts`, using `server.registerTool(name, { description, inputSchema }, handler)`. Do not use the legacy `server.tool(name, desc, schema, handler)` form — it works but is deprecated in the SDK.
3. **Wire** into `src/server.ts` via a `registerXxxTools(server)` call.
4. **Extend the tools/list integration test** in `test/integration.test.ts` to assert the new tool name appears.
5. **Run the full suite** — `npm test` must show zero failures before you open the PR.

## PR process

- Fork the repo, branch off `main` in your fork. Name branches `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`, or `docs/<short-name>`.
- Keep commits focused. Conventional Commits format: `<type>: <subject>` where type is one of `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
- Every PR must:
  - Pass CI (`ci.yml` runs `typecheck`, `test`, `verify:parity` on Node 20 + 22).
  - Pass the Wrangler dry-run (`wrangler-dry-run.yml`).
  - Include tests for new functionality.
  - Not introduce secrets — `.env` is gitignored; never commit API tokens.
- Open the PR against `main`. Fill in the PR template checkboxes. A reviewer will engage.
- Once approved and CI is green, the reviewer (or a maintainer) squashes and merges.

## Releasing (maintainers only)

1. Update `CHANGELOG.md` with a new `## [X.Y.Z] - YYYY-MM-DD` section.
2. Bump `package.json` `"version"`.
3. Merge the release PR to `main`.
4. Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`.
5. The `release.yml` workflow takes it from there — runs tests, builds, creates a GitHub Release with auto-generated notes and the `--dry-run` worker bundle attached.

## Code conventions

- TypeScript strict mode, `noUncheckedIndexedAccess: true`. Use non-null assertions on known-non-optional captures (e.g., `match[1]!`) where TypeScript can't infer non-optionality.
- `.js` extensions on relative imports (NodeNext ESM).
- Zod schemas inline with tool registration — no separate schemas directory.
- All tool inputs validated by Zod; all outputs JSON-stringified into `content[0].text`.
- No Node runtime deps (`node:fs`, `node:path` at runtime). The `scripts/` directory runs under `tsx` at author time, not in the worker.

## Questions

Open an issue using the appropriate template. For security issues, do NOT open a public issue — use the flow in `SECURITY.md`.
