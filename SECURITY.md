# Security Policy

## Reporting a vulnerability

**Preferred channel — GitHub Private Vulnerability Reporting:**

1. Navigate to https://github.com/jv-tier321/tier321-mcp/security/advisories/new
2. Fill in the advisory form. GitHub routes reports privately to the maintainers; they are never public issues.
3. You'll receive an acknowledgment within 72 hours.
4. If the report warrants a CVE, GitHub coordinates the assignment.

**Backup channel:** if you don't have a GitHub account or the private-reporting flow is unavailable, email `security@tier321.com`. Please include:

- A description of the issue
- Reproduction steps
- The version (commit SHA or tag) where you reproduced it
- Your disclosure preferences

## Disclosure window

Ninety (90) days from the acknowledged report to public disclosure, shortened or extended by mutual agreement. Critical issues with active exploitation move faster.

## Scope

**In scope:**

- This repository's source code (`jv-tier321/tier321-mcp`)
- The behavior of a Worker deployed from this repository
- Supply-chain issues in direct dependencies listed in `package.json`

**Out of scope:**

- `tier321.com` production properties (including `mcp.tier321.com` — a DIFFERENT deployment, not this code running verbatim)
- Other TIER 321 LLC properties
- Issues in transitive dependencies that do not affect code paths reachable from this Worker
- Third-party platforms this Worker runs on (Cloudflare itself — report those to Cloudflare's program)

## What counts as a vulnerability

Any of:

- Remote code execution
- Authentication or authorization bypass in any future authenticated capability
- Data leakage beyond what the read-only tools intentionally expose
- Denial-of-service below the documented rate-limit threshold
- Supply-chain attacks via package update

Anonymous enumeration of intentionally public tools is expected. Report per-request resource amplification, input-limit bypasses, or data exposure beyond the documented public content boundary. Cloudflare rate counters are eventually consistent per location, so the request-count threshold is not a global quota.

## Safe-harbor

Good-faith security research within the scope above is welcome. We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, destruction of data, and degradation of service
- Only interact with accounts they own or have explicit permission to test against
- Do not exploit issues beyond the minimum needed to demonstrate them
- Report issues through the preferred or backup channel and give us a reasonable time to respond before public disclosure

## Supported versions and controls

The latest 0.2.x release is the supported security baseline; upgrade older 0.1.x deployments. This reference release remains anonymous and read-only. It rejects batches, bounds streamed bodies and tool arguments, requires explicit browser origins, and returns sanitized failures. See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for trust assumptions and [CHANGELOG.md](CHANGELOG.md) for migration details.

Never place secrets or private customer content in bundled data: all tool results are public. Keep `.env*`, `.dev.vars*`, private keys and deployment credentials out of commits and artifacts. Authenticate deployment through an operator account or narrowly scoped token. No deployment credentials are required by CI or GitHub release jobs.

Maintainers should keep dependency alerts and automated security PRs, secret scanning/push protection, private vulnerability reporting, required CI checks and CodeQL enabled. These GitHub settings are external to this repository and must be verified after forks or policy changes. Passing an advisory audit means no known matches at that time; it is not proof that software has no vulnerabilities.
