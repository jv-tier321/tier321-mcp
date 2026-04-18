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
- Authentication or authorization bypass (when OAuth write tools ship)
- Data leakage beyond what the read-only tools intentionally expose
- Denial-of-service below the documented rate-limit threshold
- Supply-chain attacks via package update

Rate-limit evasion, brute-force tooling enumeration, and similar "by-design" behaviors of a public read-only endpoint are not vulnerabilities — they're the documented surface. Please don't report them.

## Safe-harbor

Good-faith security research within the scope above is welcome. We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, destruction of data, and degradation of service
- Only interact with accounts they own or have explicit permission to test against
- Do not exploit issues beyond the minimum needed to demonstrate them
- Report issues through the preferred or backup channel and give us a reasonable time to respond before public disclosure
