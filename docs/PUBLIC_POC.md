# Public proof-of-concept boundary

This repository demonstrates TIER 321's MCP implementation: eight discoverable, typed, read-only tools, a bounded Streamable HTTP transport on Cloudflare Workers, repeatable tests and a reproducible release. Fictional Example Corp data lets people run and evaluate the complete demonstration without access to TIER 321 systems or customer information.

## What belongs in the public repository

- The reference implementation, tool schemas, synthetic fixtures and example content.
- TIER 321 branding and information explicitly approved for public release.
- General architecture, security controls, limitations, setup instructions and placeholder configuration.
- Public release versions, source commits, checksums and sanitized test summaries.

The example catalog describes fictional products. Its descriptions of integrations, authentication or future products are sample data, not implemented MCP capabilities or statements about TIER 321's product roadmap. The actual tool behavior is documented in the [README](../README.md).

## What stays in private operator records

Keep credentials, account and tenant identifiers, deployment-version identifiers, production configuration, internal endpoints, customer or employee information, nonpublic business material, operational logs and screenshots out of commits, issues, PRs, release notes and attachments. Use placeholders for account-specific hostnames and configuration in public instructions. A live demo address may be deliberately published by its owner; copying one from deployment output is not the publication process.

Store deployment and rollback records in an access-controlled operator location. An ignored local file can be a working copy, but is not a backup or a shared system of record. The smoke script prints its target and test metadata; review and sanitize that output before sharing it publicly. Never attach unreviewed headers, cookies, request bodies or tool responses.

Provider identifiers and an anonymous demo URL are not authentication credentials. Reducing unnecessary operational detail does not make an endpoint private, and removing a value from the current documentation does not remove it from Git history, forks or caches. If a credential is exposed, revoke or rotate it promptly and use the private reporting channel in [SECURITY.md](../SECURITY.md); editing the text alone is insufficient.

## Properties the demonstration must preserve

The POC must remain safe to operate when its source code and endpoint are known. All anonymous tool results must be intentionally public. Fixed bundled fixtures must remain separate from private data and production resources. The current implementation has no runtime secrets, storage, external service calls or write tools. Keep the documented input bounds, origin policy, rate limiter, generic failures and least-privilege build/release workflow intact.

Real company content may replace examples only after a review of every returned field and full document body for public release. This does not authorize connecting a private database, syncing an internal repository or exposing draft material. Private integrations and write tools require a separate design for authentication, authorization, scoped credentials, isolation, retention and auditing before implementation. See [enhancements for review](ENHANCEMENTS.md).

## Publication review

Before publishing a change, inspect the complete diff and any generated assets or archives. Confirm that examples contain synthetic or approved public information and that new tools cannot cross into private systems. Sanitize reproduction steps and evidence, run the appropriate tests and secret checks, and require current-head CI and review. A clean scanner result reduces risk; it cannot prove that every confidential fact or credential format has been detected.

Public security documentation should describe controls and limitations accurately. Report suspected vulnerabilities privately and coordinate any sensitive disclosure through [SECURITY.md](../SECURITY.md). This publication guidance does not change vulnerability-reporting scope or create an exclusion for real security findings.
