# Phase 10 — local production hardening

Audit: 1 October 2026; final closeout: 2 October 2026. Base checkpoint: `9f2a074` (Phase 9 free map integration). All changes remain local and uncommitted. No deployment, push, reseed, reset or migration execution was performed.

**Phase 10 local production hardening complete; Aurelia Estates is ready for the separate deployment step.** This readiness is for the fictional portfolio with the documented external integrations and limits below, not certification of a live property business.

## Scope and changes

The completed platform remains a fictional portfolio: public catalogue and cinematic experience; Neon/Prisma; Better Auth customer accounts; five-role Private Office; Gemini concierge; local WhatsApp integration; MapLibre/OpenStreetMap and optional routing. Existing animation choreography, story gesture controller, navbar jump mechanism and 3D assets were not changed.

| Identified risk | Resolution |
| --- | --- |
| Missing security headers | All routes receive nosniff, strict-origin-when-cross-origin, DENY frame protection, restricted browser permissions and a compatible CSP baseline. Powered-by header removed. HSTS is emitted only for an explicitly configured production HTTPS origin. |
| Incomplete metadata | Root/social metadata, project-specific title/description/image, canonical links, sitemap and robots are consistent. Project JSON-LD is a fictional CreativeWork, not a real sale/address claim. The portfolio intentionally stays noindex/nofollow; robots disallows crawling. |
| Production localhost defaults | `applicationUrl` requires a configured production origin, rejects credentials/path/query/fragment and non-HTTPS public URLs. Explicit HTTP loopback is allowed for local production previews. Canonicals, sitemap, JSON-LD, auth base and prepared communication links reuse it. |
| Duplicate catalogue work | React request-local cache shares the project record between metadata and page rendering. Metadata no longer performs inventory/related-search work. Independent project inventory, related collection and location reads run concurrently; inventory counts no longer form an extra serial step. No persistent private/customer cache added. |
| Every auth caller treated as local | Auth accepts one validated IP from an explicitly configured, ingress-overwritten header. Arbitrary forwarded chains and client-supplied internal identity headers are not trusted. Missing/malformed configured identity fails closed. Loopback development retains its local fallback. |
| HTTPS reverse-proxy compatibility | CRM, location and communication mutation origin checks use the configured public origin. Concierge guest cookies remain Secure when external HTTPS terminates before the internal HTTP server. Generic API errors are no-store. |
| Dependency advisories | Compatible patches: Next 16.3.4 → 16.3.6; transitive fast-uri 3.1.7 → 3.1.8. No forced or major upgrade. |

The enforced CSP is deliberately limited to `base-uri`, `object-src`, `frame-ancestors` and `form-action`. It is **not** a comprehensive script/XSS policy. Nonce-based scripts and deployment-specific connect/image/worker sources require a separate report-only rollout against the actual production origin and tile provider. HSTS has neither preload nor includeSubDomains.

## Executed verification

These are fresh Phase 10 results, not claims based solely on earlier phase reports. Successful suites were not repeated. Targeted retries were limited to the new test harness, generated declarations and lint configuration.

| Verification | Result |
| --- | --- |
| Permanent unit regressions | 54 pass: validation, permissions, transitions, secret-safe streaming, bounded tools, memory, map lifecycle/failure, scene asset/camera and gesture momentum rules, webhook signatures/delivery rules, new URL/origin/IP cases. |
| Database sequencing + provider protocols | 11 pass: concurrent relation loads, exactly-once transaction operations, rollback/recovery, pool release, no re-entrant pg warning; bounded Gemini loop, cancellation, malformed tools, failures; map/routing failure contracts. |
| Customer integration | 7 pass including parent: signup, duplicate registration, Argon2id/session attributes, invalid login, private routes, shortlist, saved searches, visit/enquiry ownership and idempotency, profile, logout and expiry. |
| Admin security and isolation | 4 pass including parent: five staff roles, guest/customer rejection, redacted viewer DTO, cross-agent/customer IDOR, spoofing, archived inventory and immutable history. |
| Location integration | 5 pass including parent: RBAC, cross-project nearby IDs, concurrent edits, unchanged-save audit behavior, verified public/Gemini projection, archived QA isolation and unchanged visit semantics. |
| New hardening integration | 3 pass: real DB-backed auth throttling, 56 direct API role/resource combinations plus cross-origin mutation denial, applied migration checksums and unchanged public inventory. |
| WhatsApp local integration | 7 pass: signed challenge/webhook, duplicate delivery, all role boundaries, mock outbound idempotency, delivery history, 24-hour/template/consent/STOP rules, human takeover during AI draft, CRM preparation and uncertain transport. No live Meta call. |
| Concierge ownership/actions/memory | 10 pass including parent: exact public searches/comparison, foreign guest/account denial, cookie-bound claiming, private-field exclusion, shortlist/save-search idempotency, request review handoffs, injection-shaped arguments, remembered filters, conversation leases, expired-session rejection and usage budget. |
| Live Gemini | Four representative requests pass: grounded `location_context`; refusal to invent airport time/distance; `search_residences` with six real matching unit facts; refusal of private CRM/customer/secret/system-prompt/SQL injection request with no tools executed. Official Gemini adapter remains active, with no OpenAI fallback. |
| TypeScript / lint / production build | Pass. Next 16.3.6 compiled, typechecked and generated all routes. Source lint includes permanent tests/scripts; byte-identical copied MapLibre vendor distribution is excluded. |
| Production start | Actual `next start` runs on loopback port 3001. Public homepage/catalogue/project, auth, account/admin redirects, grounded search/location/concierge APIs, sitemap, robots and brochure return expected responses. |
| Secret scan | Zero matches: 40 client-source files, 83 public/client-build files and 743 server-build files. Includes configured secret/password values and forbidden server identifiers in exposed code; server build is checked for literal secret values. Env/QA/cluster files remain ignored; only `.env.example` is tracked. |
| Dependency audit | Zero vulnerabilities after compatible patches. |

Counts include Node's parent test entries where indicated; they are not counts of unique business scenarios.

### Important test findings

- Better Auth stores rate budgets in PostgreSQL (`AuthRateLimit`), not process memory. Ten failed sign-ins per minute are allowed before 429; signup has five/minute. The real probe confirmed that spoofing `x-aurelia-client` cannot bypass the limit. IPv6 addresses share the library's default /64 budget; distinct subnets remain independent. This is database-backed abuse protection, not a claim of a load-tested global edge limiter. Retain upstream request/body/rate controls.
- The initial new test mistakenly treated two addresses in one /64 as separate clients. Correcting the test verified the intended behavior; application limits were not weakened.
- A stale generated dev route declaration after the Next patch blocked the first standalone TypeScript attempt. It was regenerated from Next's own type output. No route source workaround or TypeScript suppression was introduced.
- Lint initially included copied minified MapLibre worker/shared files. `public/vendor/**` is excluded as third-party build output; the copy is verified byte-for-byte against the installed package. New tests now await their Node test promises.
- The retained dependency-audit JSON was the pre-patch snapshot. A targeted final audit replaced that evidence with a separate post-patch report: all severity counts zero. No dependencies were changed during closeout.

## Browser and accessibility record

Chromium-based Codex in-app browser was actually used. Firefox, WebKit/Safari, physical touch devices and low-memory hardware are **unverified**; no cross-browser certification is claimed.

Requested widths: **360, 390, 430, 768, 1024, 1280, 1366, 1440, 1920px**.

- Completed: public homepage; project/location with loaded MapLibre; catalogue; customer sign-in and account; visit dialog and Gemini panel. No horizontal page overflow in these matrices. Public form controls have accessible names; project images have alt attributes. Tables retain their own horizontal scrolling containers.
- Completed production interactions: all six direct navbar targets reached with sticky-header offset and no Lenis lock; Aurelia Way entry and deliberate 01→02→03→02 manual gestures; 3D model/camera rendering; reduced-motion control via keyboard and readable 3D fallback; navigation to other routes released the experience.
- Customer production login, refresh persistence, saved Goa-search reopening and logout pass. API tests separately verified customer mutations and submission ownership.
- Visit dialog keyboard Escape dismissal, explicit validation messages and viewport containment pass. Map has textual locality/verification disclosure, visible attribution and cooperative scrolling. No verified pin/distance is invented for fictional unverified sites.
- Staff production matrix: 14 screens at all nine widths, **126 measured layouts**, with actual viewport width checked and zero page overflow. Coverage: dashboard, leads, customers, enquiries, visits, follow-ups, inventory, communications list/detail, analytics, staff, audit, locations list/editor. Combined with seven public/customer/dialog surfaces at nine widths, the saved matrix contains **189 layouts**. A preliminary hidden-tab matrix was discarded after discovering that viewport overrides resize the selected tab; all 126 staff rows were replaced with actual-width measurements on that tab.
- Production staff sign-in, mobile office navigation, project-editor back links, paused mock communication history and sign-out pass. Provider-unavailable outbound/draft/template controls stay disabled. No real message or inventory/location edit was submitted during the browser audit.
- Production MapLibre loads on request, renders real regional tiles with attribution and no unverified site marker. The final 1440px capture is saved locally. Deliberately returning 503 for the GLB in a separate proxy produces the readable static architectural fallback with no canvas. Its expected resource/loader diagnostics belong to the fault-only tab, not the normal production console.
- Browser viewport emulation is not physical-device testing. Reduced motion was exercised through the application's accessible control; OS preference emulation was unavailable in this browser tool.

Manual checks cover headings, labels, readable contrast, keyboard activation, visible focus, modal release, textual map/model alternatives and motion reduction. This is not a formal WCAG conformance audit or exhaustive screen-reader assessment.

## Performance and failure behavior

No image compression, visual downgrade or animation removal. Existing responsive 640/1200/1800 WebP variants, local fonts and custom image loader remain. The true project hero is already prioritized; the below-fold gallery deliberately remains lazy. The dev-only garden-image LCP advisory reproduces when the same image URL appears as hero and gallery on a deep hash load. Preloading every gallery duplicate is not justified. Existing homepage size advisories can also be influenced by animated masks/resizing; no speculative styling changes were made.

Normal production browser logs contain no blocking error or hydration error. Existing Three/WebGL shader compiler warnings X4122 (precision) and X4008 (floating-point division) remain on this browser/GPU; the model and camera rendered successfully. They were not suppressed and no 3D implementation was changed. Dev image advisories remain as above. Fault-only model/database processes intentionally emitted their respective failure diagnostics and were stopped after verification.

The request-local metadata cache and independent query concurrency remove evidenced redundant work/waterfalls. The GLB is approximately 2,019 KiB. All 35 production JS files together gzip to approximately 1,087 KiB; this is an **all-routes total**, not the homepage initial transfer. MapLibre is requested on demand; 3D remains dynamically loaded with demand rendering and visibility handling. No new RAF loop or animation controller was added.

Local production HTTP samples: warm home about 0.5s, catalogue about 4.6s, project about 3.2s, grounded search about 2.2s, location about 0.5s. These include local-machine/Neon network conditions, are single smoke samples, and are neither production latency promises nor Core Web Vitals scores. Hosting near Neon and field measurement remain deployment work. No Lighthouse/LCP/CLS percentile or formal load-test result is claimed.

An isolated production process pointed to a closed loopback database port returned a safe 503 API response and a generic streamed project error, without a connection URL or driver stack in client output. The actual Neon and local databases were untouched. Provider protocol tests cover Gemini quota/transport/truncation/abort; map tests cover missing/invalid config, invalid coordinates, timeouts, quotas, cleanup and textual fallback. Search truthfully returns zero matches. Empty customer collections remain usable; expired/private access is rejected.

## Database, privacy and QA

Applied migration names/checksums match committed migration files (line-ending normalization accepted). No migration ran. Public inventory remains **8 projects / 96 units**. Schema already indexes public filters, ownership, sessions, timeline and communication keys; queries use validated page/size bounds, parameter binding, repeatable-read catalogue snapshots and transaction-scoped clients. Runtime pool remains max 5 per process, bounded connection timeout, with tested release/rollback. Size total instance pools against the Neon plan before scaling.

The existing local PostgreSQL 18.4 cluster was started and verified read-only; loopback has no TLS, while Neon uses certificate-verified TLS. It is a separate explicit fallback, not a runtime failover destination. Its catalogue/schema readiness must be checked separately before using new features there. No fallback reseeding or migrations were performed.

No staff grants were added. The historical temporary browser QA elevation remains disabled (active count zero). Location test fixtures remain ARCHIVED and excluded from public data; synthetic WhatsApp records use mock provider identifiers and are PAUSED with no AI draft. Audit history is retained. Closeout removed exactly one saved search created by this run and preserved the older same-named search. Exactly 17 still-active QA sessions created on/after 1 October were expired, scoped to the known fixture identities and the two new fictional integration customers. Those customer accounts and submission/history records remain as private QA provenance; they are visible in staff analytics and must not be mistaken for real customers. No existing business account, role, request or history was removed. Ignored evidence is local only.

## Environment names and deployment procedure

| Category | Server-side names |
| --- | --- |
| Required public production | `DATABASE_URL`, `DIRECT_URL`, `SITE_URL`, `AUTH_BASE_URL`, `BETTER_AUTH_SECRET`, `AUTH_TRUSTED_IP_HEADER`, `GEMINI_API_KEY` |
| Optional | `AURELIA_GEMINI_MODEL`, `MAP_TILE_URL`, `MAP_TILE_ATTRIBUTION`, `OPENROUTESERVICE_API_KEY`, `WHATSAPP_GRAPH_VERSION`, `WHATSAPP_PUBLIC_PHONE`, `PORT` |
| External Meta provisioning | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET` |
| Development / QA only | `DB_TARGET`, `AURELIA_ENV_FILE`, `ALLOW_DB_TESTS`, `ALLOW_LIVE_AI_TEST`, `TEST_BASE_URL`, `PHASE8_RECHECK_OUTBOUND`, `AI_AUDIT_AUTH` |

Do not expose server secrets with `NEXT_PUBLIC_`. Tile URL/attribution and an optional public WhatsApp destination are public configuration and must never contain secret query parameters. OpenAI is inactive and its key is not required. No Google Maps API credential is required; external directions links do not load a paid Maps API.

1. Deploy separately to a supported **Node server** (Node >=22.13; validated on 24.18), not a static export. Historical static-hosting configuration is not suitable for authenticated routes, streaming Gemini, Prisma or webhooks.
2. Provision runtime secrets in the server environment. Do not ship local `.env`, `.env.neon`, `.env.auth`, QA cache or local cluster directories. The local database-env helper intentionally selects ignored Neon/local files; absent those files, deployment environment variables apply. Set the actual HTTPS `SITE_URL` and matching `AUTH_BASE_URL` **before build and start**. Never retain a loopback value for public deployment.
3. Configure a trusted reverse proxy/TLS ingress. It must strip/overwrite the chosen single-IP header (`x-aurelia-proxy-ip`, `cf-connecting-ip` or `x-real-ip`) and block direct access to the origin. Merely setting the environment name does not make a caller-controlled header trustworthy. Keep the public Host/origin consistent; do not forward arbitrary client-provided identity chains.
4. Run `npm ci`, then `npm run db:generate`. Review dependency install-script approvals in the package manager; do not blindly enable all scripts. Run `npm run db:check` without logging connection strings.
5. Before an actual release, take/verify a Neon recovery point and inspect migration status against the **direct** URL. If there are pending reviewed additive migrations, run `npm run db:migrate` once (`prisma migrate deploy`). Never run reset, db push, truncate or seed against existing production data. No migration is needed solely for this Phase 10 change.
6. Run `npm run typecheck`, `npm run lint`, `npm run build`. The prebuild step copies MapLibre CSS, worker, shared module and license to `public/vendor`; ship those with `public/images`, models, plans and fonts plus the server build.
7. Local preview: `npm start -- --hostname 127.0.0.1` uses port 3001. Deployment process manager: `node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port <assigned-port>` behind the private ingress. Keep streaming unbuffered for the concierge and allow request-abort propagation. Secure cookies depend on the configured HTTPS origin.
8. Readiness should check an application page and a small grounded read such as `/api/search/?pageSize=1`, with timeouts and no personal data in logs. Static page health alone does not prove Neon readiness. Monitor status/latency/5xx, exhausted connection pools and provider failures using redacted diagnostics. Set retention for expired sessions/rate budgets and private request data according to the actual deployment policy.
9. Meta verification requires a public HTTPS `/api/whatsapp/webhook/` callback and a configured provider account. Redact verification query strings at the proxy too. Verify raw-body signature handling, challenge and a real approved message in that separate step; do not claim local mock tests prove delivery.
10. Free OSM-compatible tiles require visible attribution and compliance with the selected tile service's capacity/usage policy. Optional routing stays unavailable without its server key; textual stored context remains usable. Review actual hosting traffic before selecting a production tile capacity arrangement.

Recovery: retain the prior code/build and lockfile; roll back the application release separately from data. Do not reverse applied migrations by deleting history. For data incidents use the verified Neon recovery/branch procedure and reconcile retained audit records. Confirm auth secret continuity to preserve sessions; intentional rotation invalidates them. Keep the local fallback independent.

## External and non-blocking limits

- **Phase 8 local implementation complete; live Meta verification pending.** External provisioning is not retried here.
- Optional live routing remains unconfigured/unverified; safe fallback passes.
- Firefox/WebKit/physical-device, sustained concurrency/load and real deployment ingress/TLS verification remain separate work.
- Baseline CSP is not a full nonce-based script policy. Ingress identity sanitization and private origin access are deployment prerequisites.
- Customer email/phone verification, email change/recovery delivery are not implemented; the UI discloses this. Do not advertise verified identities or a password-reset service.
- Model safety checks are representative, not a guarantee against every prompt injection. Free-tier quota/provider availability still applies.
- Existing dev image advisories and the observed non-blocking Three/WebGL shader warnings remain. Windows dependency installation also reported an old SWC DLL cleanup warning and package install-script approval notice; final compilation and audit passed.

## Exact material file inventory

- Configuration/dependencies: `.env.example`, `.oxlintrc.json`, `next.config.ts`, `package.json`, `package-lock.json`.
- Origin, proxy and authentication: `lib/site-url.ts`, `lib/auth/request-ip.ts`, `lib/auth/server.ts`, `lib/http.ts`, `app/api/auth/[...all]/route.ts`, `app/api/admin/[[...parts]]/route.ts`, `app/api/admin/locations/[slug]/route.ts`, `app/api/concierge/[[...parts]]/route.ts`, `lib/communications/contracts.ts`, `lib/communications/service.ts`.
- Metadata and query efficiency: `app/layout.tsx`, `app/page.tsx`, `app/residences/page.tsx`, `app/residences/[slug]/page.tsx`, `app/sitemap.ts`, `app/robots.ts`, `lib/repositories/projectRepository.ts`, `lib/services/projectService.ts`.
- Verification: `tests/hardening.test.ts`, `tests/hardening.integration.ts`, `scripts/hardening-live-ai.ts`, `scripts/hardening-secret-scan.mjs`.
- Documentation: `README.md`, `QUALITY-AUDIT.md`, `docs/PHASE-10-FINAL-HARDENING.md`.

Generated declarations/build output and ignored `.cache/phase10-*` evidence are not application source changes. No schema, historical migration, scene asset, animation controller or map component was modified.

## Final closeout

All required local checks passed. The final production map and mobile staff navigation checks completed; customer and staff browser sessions were signed out. The disposable search/session cleanup and public inventory isolation assertions passed in one bounded transaction. Fault-only servers and temporary audit tabs were closed; the ordinary local development and production previews and local PostgreSQL fallback remain available. Browser viewport overrides were reset.

Local evidence: `.cache/phase10-browser-matrix.json`, `.cache/phase10-cleanup-result.json`, `.cache/phase10-dependency-audit-final.json`, `.cache/phase10-lint.txt`, `.cache/phase10-production-location.png`, plus this turn's test/build/HTTP results. The older dependency-audit JSON records the pre-patch findings. Screenshots and QA evidence remain ignored and unpublished. README and QUALITY-AUDIT now identify this report as current; historical phase reports remain historical. No broad test/build repeat was necessary for documentation-only closeout. Final `git diff --check` and `git status --short` were reviewed; all intended changes remain uncommitted.
