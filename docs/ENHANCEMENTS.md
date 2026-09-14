# Enhancements for review

The 0.2.0 work keeps the existing eight-tool public catalog. These optional changes are proposals, not implemented capabilities.

| Proposal | Benefit | Review needed before implementation |
|---|---|---|
| Structured content and output schemas | Clients can consume typed results without parsing text | Keep text compatibility, define error shapes and test all outputs |
| MCP resources for public documents | Clients can browse stable document URIs | Explicit public-content allowlist; no arbitrary URL or file resolution |
| Publish-time catalog validation | Catch empty fields, invalid dates and accidental draft content before bundling | Define public/draft metadata and preserve simple fixtures |
| Reusable template deployment checks | Help fork owners verify domain/origin/limiter configuration | Avoid shipping organization IDs or granting broad credentials |

OAuth, contact submission, private catalogs and external connectors substantially widen exposure. They require a separate design covering scopes, consent, quotas, auditability and data retention before any implementation. No such integrations are included in this release.
