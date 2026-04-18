# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
