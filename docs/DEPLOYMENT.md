# Staging deployment and live validation

The `staging` environment deploys the public reference server to a dedicated **`tier321-mcp-staging`** Worker. It serves the fictional Example Corp data included in this repository. This is an anonymously accessible test deployment, not a private environment or the separately operated `mcp.tier321.com` service.

## Target and exposure

| Setting | Staging value |
|---|---|
| Wrangler environment | `staging` |
| Worker | `tier321-mcp-staging` |
| Routing | Worker-specific `workers.dev` address; no custom domain or zone routes |
| Version preview URLs | Disabled |
| Browser origins | Empty allowlist: browser-origin requests are denied; native MCP clients remain supported |
| Rate limiter | Separate account-scoped namespace `32102001`; 20 admitted POST requests per 10 seconds per IP per location |
| Application data | Fixed public example catalogs and blog text only |
| Credentials and state | No runtime secrets, databases, storage or external service bindings |

The explicit environment repeats `vars` and the limiter binding because these settings are not inherited. Fork operators must choose their own account, unique Worker name and unused limiter namespace. See Cloudflare's [environment configuration](https://developers.cloudflare.com/workers/wrangler/environments/) and [preview URL settings](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/).

Cloudflare observability is enabled and may retain platform request metadata. The application never intentionally logs request bodies or exception details. All returned catalog content is public; review bundled data before every deployment. Empty CORS configuration does not make the service private.

## Deploy

Use patched Node 22 or 24 and the committed lockfile. Authenticate using operator OAuth (`npx wrangler login`) or a narrowly scoped token from your secret manager. Never place deployment credentials into source, Worker variables, terminal arguments or public evidence.

```sh
npm ci --ignore-scripts
npm run types
npm run check
npm run audit
npm run verify:release
npm run build:staging
npx wrangler whoami
npx wrangler deployments list --env staging
npm run deploy:staging
```

For the first deployment, the deployment-list command reports that the Worker does not exist. Confirm the selected account and the exact staging name before continuing. On later deployments, record the existing active version for rollback. `deploy:staging` passes `--env staging --strict`; review any remote-change conflict before retrying. Do not substitute the bare `npm run deploy`, which targets the default environment and may update an existing Worker.

The staging environment is recorded in `wrangler.jsonc`; no production route is attached. GitHub CI and release workflows perform validation and publishing only. They do not deploy to Cloudflare or hold deployment credentials.

## Live checks

Use the endpoint printed by the deployment, including `/mcp`:

```sh
npm run smoke:staging -- https://tier321-mcp-staging.YOUR-SUBDOMAIN.workers.dev/mcp
# Optional bounded rate-limit and recovery check, only against your staging Worker:
npm run smoke:staging -- https://tier321-mcp-staging.YOUR-SUBDOMAIN.workers.dev/mcp --check-rate-limit
```

The script rejects production/custom-domain URLs, credentials, non-HTTPS URLs and redirects. It checks SDK initialization and the package version, the exact eight tools and their safety annotations, successful calls, argument bounds, response security headers, routes/methods, native OPTIONS, denied browser origins/preflight, media types/encodings, invalid JSON/UTF-8, batches, body size and JSON depth. It prints check names and metadata without tool response contents. Normal requests are paced; the optional rate probe sends at most 30 small pings over one TLS-verified HTTP/2 connection with at most three requests in flight, stops scheduling batches once a 429 is observed, checks `Retry-After`, and verifies recovery after 11 seconds. It records probe duration and Cloudflare location codes, without client IP addresses. The probe waits for a quiet window and a wall-clock boundary to reduce timing noise; this does not guarantee alignment with provider counters. It does not run automatically in CI.

Rate counters are eventually consistent and location-local. Failure to observe 429 within this bounded probe requires investigation, not increasing traffic. A successful run does not establish a global quota or load-test capacity. The five-second slow-body deadline, streamed-byte enforcement without Content-Length, internal binding failure and sanitized unexpected exceptions remain covered by local tests; this live smoke check does not deliberately trigger those conditions at the edge. Positive browser-origin checks require a separately reviewed allowlist change.

## Rollback or stop exposure

Record the source commit, account privately, Worker version, deployment time, endpoint, previous version and smoke results for each deployment. No user data needs migration because this Worker has no persistent application storage.

If a previous known-good **staging** version exists:

```sh
npx wrangler deployments list --env staging
npx wrangler rollback PREVIOUS-STAGING-VERSION-ID --env staging
npm run smoke:staging -- https://tier321-mcp-staging.YOUR-SUBDOMAIN.workers.dev/mcp
```

Review the rollback target and any changed binding settings. Do not substitute a production version or roll back to a version with known security defects. On the first deployment there is no older staging version to restore. To stop public exposure while retaining the Worker, set `env.staging.workers_dev` to `false` (keep `preview_urls: false` and `routes: []`) and deploy the staging environment again. Record the change, verify the endpoint is unavailable, and explicitly review any later re-enablement. Worker deletion is a separate operator action.

## Deployment record

### 2026-09-14 — v0.2.0

| Evidence | Verified value |
|---|---|
| Endpoint | `https://tier321-mcp-staging.jv-a60.workers.dev/mcp` |
| Deployment time | 2026-09-14 19:02:11 UTC |
| Worker version | `b8804cd2-e33b-43d4-b092-2909fe4df545`, 100% of staging traffic |
| Deployment source | `2f87b2142a2a5c21ed283e13906594f31507985f` (staging configuration added to v0.2.0) |
| Application release | [v0.2.0](https://github.com/jv-tier321/tier321-mcp/releases/tag/v0.2.0), release commit `c6c2669f9ff1788e5afc365c3343135286f32d51` |
| Bundle comparison | Deployed build's `index.js` byte-for-byte identical to the published v0.2.0 archive |
| `index.js` SHA-256 | `308f9748b038f4c88d965acc653cda358fbb011c112c488cdf8fdcc4ac237054` |
| Prior staging version | None; this was the first deployment |
| Live smoke completion | 2026-09-14 19:08:57 UTC; 28 named checks passed; 54 HTTP requests in the final run |
| Rate probe | 429 observed within 24 pings over one HTTP/2 connection; 5,759 ms; all 24 at IAD; at most three in flight |
| Recovery | Ping returned 200 after an 11-second wait; limited response included `Retry-After: 10` |

The live SDK client negotiated version 0.2.0, verified the exact eight annotated tools and called each successfully. All request-boundary checks listed above passed. Cloudflare's API confirmed the empty origin allowlist, isolated rate-limit binding, `workers.dev` enabled and version preview URLs disabled. Local verification passed 55 Miniflare tests, types, data shapes, both bundles, release metadata/packaging and a zero-match npm advisory audit.

Earlier bounded probes were inconclusive: measured sequential ping latency was 300–640 ms, and a 30-request concurrent probe was split between EWR and IAD. The final harness uses one connection and records timing and location counts. This is evidence of the documented per-location limiter and recovery, not proof of a strict global quota. See Cloudflare's [rate-limit accuracy and locality](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

The existing `tier321-mcp-server` active version was checked before and after and remained unchanged. No custom production route or production deployment was modified. Subsequent operator-script and documentation changes do not change the deployed v0.2.0 application bundle. Rollback/disable commands are documented above; they were not executed during this first successful deployment.
