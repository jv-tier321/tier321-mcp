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

The script rejects production/custom-domain URLs, credentials, non-HTTPS URLs and redirects. It checks SDK initialization and the package version, the exact eight tools and their safety annotations, successful calls, argument bounds, response security headers, routes/methods, native OPTIONS, denied browser origins/preflight, media types/encodings, invalid JSON/UTF-8, batches, body size and JSON depth. It prints check names and metadata without tool response contents. Normal requests are paced; the optional rate probe sends at most 30 sequential small pings, stops at the first 429, checks `Retry-After`, and verifies recovery after 11 seconds. It does not run automatically in CI.

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

The first staging deployment record and live results will be added after verification. The application source is the v0.2.0 release; this change adds staging configuration, an operator smoke script and documentation.
