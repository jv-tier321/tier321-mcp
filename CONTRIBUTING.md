# Contributing

Use a current patched Node 22 or 24 release. Clone the repository and install the locked dependencies with `npm ci --ignore-scripts`. CI does not need Cloudflare credentials. Run:

```sh
npm run types             # after editing Worker configuration
npm run check             # types, tests, data shape and dry-run build
npm run audit             # all dependency severities
npm run verify:release    # package, lockfile and changelog consistency
npm run package:release   # inspect the checksummed local bundle
npm run dev               # loopback-only local endpoint
```

Dependencies are pinned intentionally. Update related Cloudflare packages together and respect the test pool's Vitest peer requirements. Do not use `--force` or `--legacy-peer-deps` to conceal conflicts. npm 10.9.7 has exhibited a peer-resolution crash during a fresh update with the current optional Vitest/Vite graph; a temporary `npx --yes --package=npm@12.0.2 npm install --ignore-scripts` resolved the update. Normal CI uses the committed lockfile. npm 12 requires a recent compatible Node patch version.

## Changes and review

Branch from main using a focused `fix/`, `feat/`, `chore/` or `docs/` branch. Use conventional commit subjects. Explain behavior, exposure changes and validation in the PR. All required checks must pass, review conversations must be resolved, and security issues must be handled before merge. Never bypass checks to release.

For a tool change, register it in `src/tools/`, wire it in `src/server.ts`, add behavior and input-boundary tests, and update the tools table and architecture. Keep annotations accurate; they are not access controls. Review every field and imported document as public. Do not introduce dynamic paths, external fetching, write operations or private records without a separate threat model.

CI covers Node 22/24, type checks, Miniflare tests, shape checks, advisory checks and release metadata. The build check also packages the Worker. CodeQL checks PRs and main. Exact GitHub required-check settings are maintained separately from YAML.

## Releases

1. Update `package.json` version and regenerate `package-lock.json`; `src/server.ts` reads that version directly.
2. Add the matching dated changelog section, including migration changes and dependency exceptions.
3. Run all checks above, inspect the archive and its public content, and merge the reviewed PR with green required checks.
4. Tag the reviewed main commit with `vX.Y.Z` and push that tag. Never move a published tag.
5. Confirm the release workflow succeeds and verify the release tag, assets and checksums. It performs a read-only build/test job and publishes in a separate job with repository write permission.

GitHub Release assets are a reference Worker bundle, not an npm publication or Cloudflare deployment. The package remains private to prevent accidental npm publication. Deploy forks manually with a scoped operator account after configuring their own name, domain, origin allowlist and rate-limit namespace. Keep rollback tags available; do not revert security controls without reviewing the risk.

## Security reports

Use [GitHub Private Vulnerability Reporting](https://github.com/jv-tier321/tier321-mcp/security/advisories/new) or the backup channel in [SECURITY.md](SECURITY.md). Do not post exploit details or secrets in public issues, PR bodies, logs or release notes. Regression tests should demonstrate a bounded rejected input, not stress a live public service.
