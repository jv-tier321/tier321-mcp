# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Refresh the README banner and repository social-preview artwork with the Original Triad identity while retaining the fictional-data reference-server scope.

## [0.2.0] - 2026-09-14

### Security

- Bound streamed request bodies to 16 KiB and five seconds, cap JSON nesting, and accept one JSON-RPC message per HTTP request.
- Require exact configured browser origins; native clients without Origin remain supported. Add no-store/nosniff headers and sanitize unexpected exception logs.
- Bound product IDs/blog slugs and filter arrays; advertise all eight tools as read-only.
- Refresh runtime and development dependencies and enforce npm advisory checks in CI.
- Pin GitHub Actions to immutable commits, disable persisted checkout credentials, and isolate release publication from dependency installation and build execution.
- Add CodeQL analysis and broaden local secret-file exclusions.

### Changed

- Require Node 22 or 24; use the latest compatible Vitest 4 because the Cloudflare pool does not yet support Vitest 5.
- Derive the MCP server version from package metadata and verify tag/lockfile/changelog consistency.
- Publish a checksummed bundle with placeholder data and no source maps; verify release ancestry on main.
- Replace ambiguous production claims with explicit public-reference scope and a maintained architecture/threat-model document.

### Migration

- Browser clients must be listed in MCP_ALLOWED_ORIGINS as comma-separated exact HTTP(S) origins; wildcard and opaque origins are rejected.
- Send a single message per POST. Requests over 16 KiB, deeply nested JSON, encoded bodies, IDs/slugs over 128 characters, and more than four status filters are rejected.
- GitHub release publication does not deploy or change mcp.tier321.com.

## [0.1.0] - 2026-04-18

### Added

- Initial public release.
- Eight read-only MCP tools: `get_company_info`, `list_products`, `get_product`, `list_blog_posts`, `get_blog_post`, `list_industries`, `list_use_cases`, `get_contact_methods`.
- `WebStandardStreamableHTTPServerTransport` for the MCP transport layer.
- `CfWorkerJsonSchemaValidator` for JSON Schema validation (Workers-compatible — AJV doesn't work under the V8 isolate).
- Per-IP rate limiting via the Workers Rate Limiting binding (`MCP_RATE_LIMITER`), 20 requests per 10 seconds.
- Miniflare-backed test harness (`@cloudflare/vitest-pool-workers`), 22 tests covering tool dispatch, input validation, error envelopes, and sorted output.
- `scripts/verify-parity.ts` shape-check script for bundled data.
- GitHub Actions CI (`ci.yml`), PR build check (`wrangler-dry-run.yml`), tag-triggered release (`release.yml`).
