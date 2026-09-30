# Phase 9 — Location intelligence

## Saved-state continuation and status

**Phase 9 free-map integration complete.** On 30 September 2026 the Google browser/routing implementations were replaced with MapLibre GL JS 6.11.2 and an optional server-side openrouteservice adapter. The live OSM-backed map works locally without a key or paid billing. Live routing remains unconfigured; no route result is claimed. The two real Gemini/Neon checks passed on 29 September and were not repeated or changed by the map replacement. Nothing was published, deployed, uploaded or pushed.

Phase 8 status is unchanged: **Phase 8 local implementation complete; live Meta verification pending due to external test-number provisioning.** No Meta retry was attempted.

## Architecture and data

- Reuses `Location`, `Project`, `NearbyPlace`, `ProjectNearbyPlace`, the public catalogue repository, existing staff inventory permission and append-only audit records. No parallel search, staff authentication or project-management system was introduced.
- The additive `20260928090000_location_intelligence` migration was applied to Neon during the initial Phase 9 continuation. It was not rerun during final verification. Existing public projects and units were preserved; no reset, truncate or reseed was performed.
- Project fields: public address, map label, exact-site latitude/longitude, editorial narrative, source, verification timestamp and optimistic location version. Project coordinates have database pair/range constraints. Existing locality coordinates remain distinct from an exact site pin.
- Nearby relationships gain a source, context note and verification timestamp. Restaurant and park categories supplement existing categories. Original fictional records remain illustrative; no factual addresses, coordinates or commute figures were invented.
- The local PostgreSQL cluster and configuration are untouched. Apply pending additive migrations explicitly in local mode before using Phase 9 against that fallback; this closeout does not claim the local fallback was migrated or retested.

## Public location and replaceable provider boundaries

Public projection, provenance, verified-coordinate rules, safe external Google Maps links and nearby cards are unchanged. External links are ordinary URLs, not Google API dependencies. No Google API credential remains in active runtime usage.

The UI depends on the provider-neutral MapHandle/MapOptions contract in lib/location/browser-map.ts. Its cancellable mount owns one container, prevents overlapping mounts, aborts pending work and removes map resources on timeout/unmount. lib/location/maplibre-map.ts loads MapLibre and a same-origin stylesheet only after the user clicks Load interactive map. Worker and shared module assets are copied from the installed package by scripts/sync-map-assets.mjs before dev/build; an explicit same-origin worker URL avoids Turbopack relocating the default URL. The original Google adapter can be restored behind this boundary in future without replacing business logic.

A verified project uses its stored coordinates and verified nearby markers. An unverified fictional project opens a clearly labelled regional India overview at zoom 3.5, with no project/nearby markers. The viewport center is not saved as a project coordinate or used for directions or distance calculations. No seed or schema was changed.

The public /api/location/map-config/ endpoint returns only validated public tile URL/attribution. Defaults use https://tile.openstreetmap.org/{z}/{x}/{y}.png with permanently visible OpenStreetMap attribution. Optional MAP_TILE_URL and MAP_TILE_ATTRIBUTION allow a different HTTPS raster source without component changes; values must be public and contain no credentials, query parameters or attribution HTML. Invalid configuration leaves the textual fallback. Browser caching/referrers are retained; no tile proxy, bulk downloads, prefetch or offline feature is added. OSM standard tiles are best-effort, for modest demo traffic, not unlimited production hosting. See https://operations.osmfoundation.org/policies/tiles/.

The map keeps its fixed responsive height, disables wheel zoom, enables cooperative gestures, provides 44px zoom controls and keyboard-accessible marker buttons, and retains textual alternatives. Startup is bounded to 12 seconds. Map errors restore the fallback; map listeners, markers, workers and renderer resources are released by remove(). The shared JS/CSS asset promise prevents duplicate loading. Physical touchscreen behavior was not tested on hardware.

lib/location/route-provider.ts implements the existing route-estimate shape using official openrouteservice POST /v2/directions/driving-car/json. OPENROUTESERVICE_API_KEY stays server-only in the Authorization header. Coordinates are validated and ordered longitude/latitude, geometry/instructions are omitted, the timeout remains eight seconds, and returned distance/duration bounds are validated. No raw errors or credentials reach the UI. Missing key, denied/quota, malformed response, timeout and invalid coordinates return safe unavailable states. Live routing requires a free provider account/key and verified stored endpoints; it was not attempted.

The route endpoint still accepts only a project slug and a related nearby UUID, never browser coordinates, addresses or arbitrary URLs. Verified-coordinate guards, 30-second request coalescing, bounded process-local cooldown and no-store responses are preserved. These are local protections, not a claim of distributed production quota enforcement. Route results remain separate from stored editorial estimates and are attributed to openrouteservice/OpenStreetMap. There is no geocoding, scraping or fabricated travel data.

## UI, visits and search

The project location section provides editorial context, provenance, text-equivalent map fallback, categorized nearby cards, Maps/directions links and a link to the existing city/locality-filtered collection. It preserves the Aurelia palette and serif typography. No global animation, Lenis, ScrollTrigger, story controller, navbar helper or 3D file was changed.

Visit review and customer visit cards include the public project location and a lazy Maps/directions disclosure. It retrieves only the public location DTO and aborts on unmount. An unverified site offers a locality link and tells the customer to confirm the meeting point. No visit mutation, ownership rule, lifecycle transition or REQUESTED/CONFIRMED meaning changes.

Existing city/locality filters and project keyword search are reused. Corridor wording is supported only when it matches stored locality/project context; no inferred corridor membership or new geographic search engine is introduced. Nearby categories include IT hubs and business districts.

## Staff editing and security

`/admin/locations` is a location-maintenance area linked from the existing Private Office. It does not duplicate inventory management. Only ADMIN and SUPER_ADMIN inherit the existing `inventory` permission. SALES_MANAGER, SALES_AGENT, VIEWER and ordinary customers cannot read/edit this staff view. Guest requests require authentication.

Mutations check same-origin scheme/Host/port, enforce a bounded 128 KiB JSON body and strict Zod input, recheck active staff/role inside a serializable transaction, and use optimistic version conflicts. A nearby UUID must belong to the selected project. Changing a shared landmark copies it for that project, while an unshared landmark is updated in place. Unchanged submissions do not rewrite rows, increment versions or append meaningless audit events. Meaningful before/after edits are appended to the existing audit history. Incomplete coordinate pairs never silently become zero-valued coordinates.

The shared JSON-body helper retains its original 8 KiB default for all existing callers; only the new location editor opts into the larger bound.

## Gemini integration and exact 400 diagnosis

The existing Gemini provider, tool loop, streaming finalization, conversation locking, authentication and validated tool execution are preserved. The new `location_context` tool accepts 1–3 known public project slugs and one nullable allowlisted category. It returns current Neon location/provenance data, never calls Google directly and cannot access CRM data. Existing project-details output also suppresses unverified nearby distance numbers.

Offline declaration inspection found six uniquely named functions, valid names/descriptions and serializable JSON. The location object requires `slugs` and `category`, rejects additional properties, bounds the slug array, validates slug strings, and uses the existing nullable JSON-schema representation. The provider still sends `parametersJsonSchema`, removes `$schema`, and uses the existing `user`/`model` message representation.

The previous live failure was **credential rejection**, not an established function-schema incompatibility:

> HTTP 400 — API key not valid. Please pass a valid API key.

On 29 September 2026 a minimal request with **no tools, no tool schema and no conversation history** returned the same message. Thus the observed failure occurs before tool execution. No provider replacement, constraint removal or schema workaround was justified or applied. Raw headers, keys and environment values were never printed.

Resolved on 29 September 2026: the user replaced the server-side key locally and restarted the development server. Only the two requested live checks were run through the existing Gemini provider, real tool loop and read-only Neon/Prisma catalogue. No provider/schema/business-code change was needed.

- Positive query: The Eastern Grove location and hospital context. Gemini invoked location_context; Neon returned Yendada, Visakhapatnam, Andhra Pradesh and the illustrative Neighbourhood hospital entry with null distance/time. The final answer accurately repeated the locality and explicitly labelled the hospital connection as illustrative, not verified.
- Negative query: airport driving minutes and kilometres, including pressure to supply a best numerical estimate. Gemini invoked location_context; the airport subset was empty. The final answer declined both measurements and any numerical estimate because verified data was unavailable.

Both checks passed with completed final responses. This verifies these two cases, not universal hallucination immunity. The focused script retains assertions and public tool evidence. The first sandbox launch failed before executing tests; the permitted retry completed successfully. No migration, database writes, live Google call or historical suite rerun occurred.

## Original verification record - 29 September 2026 (before provider replacement)

| Check | Result |
| --- | --- |
| Coordinate, strict-input, bounded-tool, safe-URL and five-role policy tests | Passed: six tests |
| Singleton/on-demand/timeout/script-failure loader test | Passed: one offline test |
| Routes no-key, denied/quota, malformed, invalid-coordinate and timeout cases | Passed with offline transports |
| Gemini function-call protocol and missing-fact preservation | Passed with an offline model transport |
| Neon/API permissions, cross-project IDOR, CSRF, stale/concurrent edit, shared landmark isolation, unchanged-save and append-only audit tests | Passed: parent plus four subtests |
| Public Neon projection, grounded tool retrieval, existing city/locality search, archived QA exclusion | Passed in the integration suite |
| Final automated total | 14 passing tests including parent/subtests; no historical full-suite rerun |
| TypeScript | Passed; production build also completed TypeScript |
| Lint | Passed after correcting new-component accessibility/ref rules |
| Production build | Passed on 29 September 2026; 13 static pages, dynamic location/admin routes |
| Client/public secret scan | Passed: 38 client files + 32 public files, zero matches |
| Real Google Maps / Routes | Not attempted; credentials absent |
| Live Gemini location and negative grounding | Passed: two real Gemini turns, each calling location_context against Neon; accurate illustrative context and no invented airport measurements |

The initial final API run on 29 September could not connect to a stopped localhost server. Restarting the same local development server resolved that environmental failure; the focused integration retry passed. No migration was rerun. A previous stale Prisma development singleton was resolved by restarting the server after client generation, not by changing database behavior.

### Browser results retained from the implementation pass

At **360, 390, 430, 768, 1024, 1366, 1440 and 1920px**, both the location experience and admin editor passed horizontal-overflow checks. Visible location controls were at least 44px high; editor fields fit the viewport. Map fallback heights were 330px, 380px and 440px across breakpoints. Zero Google scripts loaded in the no-key state.

Desktop and 390px mobile visuals were inspected. Category filtering, keyboard focus from Maps to the locality link, the city/locality search handoff, incomplete-coordinate rejection, archived QA editing and persistence after reload passed through actual browser interactions. Existing property/account pages still rendered. Physical touch hardware and live Google map keyboard/marker behavior remain unverified.

On 29 September, after the user reopened localhost, the final shared visit Maps/directions disclosure passed at 1440px and 390px. A stale browser interaction surface was recovered by reloading the project page. The authenticated four-step form reached review with The Eastern Grove selected; expanding the disclosure loaded the public Yendada locality link and the explicit unverified-site/request-not-confirmed notice. Keyboard Enter toggled the disclosure, its target measured 46px high, and both page and dialog had no horizontal overflow. No Google script loaded and no console errors were captured. Existing Next.js image-size/LCP advisories remain non-blocking. The panel was closed without submitting a visit or changing appointment data. The shared component is also mounted in account visit cards; the available account had no existing visit card to exercise separately. Earlier eight-width results are retained rather than relabelled as new checks.

Evidence: `.cache/phase9-location-desktop.png` and `.cache/phase9-visit-directions.png`. QA projects created by integration tests stay ARCHIVED, contain no public units/visits, and retain audit provenance. Existing public project/unit counts remain unchanged. Existing QA identities were reused without new staff grants; test-created sign-in sessions were signed out.

## Configuration and remaining boundary

No environment variable is required for the default live map. Optional public raster configuration: MAP_TILE_URL and MAP_TILE_ATTRIBUTION. Optional server-only live routing: OPENROUTESERVICE_API_KEY (currently absent). .env.example contains empty placeholders only. Existing ignored Google credentials, if any, were neither read nor rewritten; the runtime no longer consumes them. The corrected GEMINI_API_KEY continues to power the existing concierge.

Live routing is the only provider verification still pending for this replacement. Fictional inventory does not supply verified exact-site/nearby endpoints; a routing key alone must not promote illustrative data into facts. Public OSM tiles have no SLA; choose a suitable provider/self-hosted service for future production traffic. Paid billing is not required for the implemented map.

## Free-map verification - 30 September 2026

- 12 focused tests passed: config/defaults and unsafe input, lazy singleton JS/CSS, duplicate/pending mount cancellation, cleanup, startup timeout, routing no-key/invalid/denied/quota/malformed/timeout/success parsing, safe directions, provenance, five-role policy and bounded Gemini protocol. Only the affected provider test was repeated after a test-only lint correction.
- TypeScript and lint passed. Production build passed (13 static pages plus dynamic routes), including final TypeScript. Client/public secret scan: 47 client files and 36 public files, zero matches.
- Actual browser at 390, 768, 1440 and 1920px: no horizontal overflow, one canvas, fixed map heights 330/380/440px, no fictional project marker, visible OSM attribution and 44px zoom controls. Before requesting the map, zero map canvases and no MapLibre stylesheet were present. Live raster tiles rendered after requesting it.
- Navigation back to the homepage removed the map canvas; returning to the project started with zero canvases and required a new explicit map request. Tab moved from Zoom in to Zoom out. Scrolling over the map moved the page (6124.8 to 6396.8px); the page was not trapped. Nearby hospital filtering and the guest visit location disclosure passed with no overflow. No visit was submitted.
- Initial browser verification exposed a module-worker URL error; explicit same-origin assets fixed it. Only that historical console entry and the existing Next image advisory remain; no new post-fix map error was observed.
- No direct inventory/customer mutations, migrations, reseeds, staff grants, auth changes or historical-suite reruns. Admin RBAC implementation and Gemini provider/tool loop are unchanged; the previous live Gemini successes are retained.
- npm reported an existing moderate fast-uri advisory through the Prisma development dependency chain (GHSA-hrr3-gc8f-f4qj). No unrelated dependency upgrade was performed. Physical touch hardware, live routing and production traffic/load remain unverified.

Evidence: .cache/phase9-free-map-desktop.png and .cache/phase9-free-map-mobile.png.

### Exact files changed by this provider replacement

Modified: .env.example; package.json; package-lock.json; app/api/projects/[slug]/location/route-estimate/route.ts; components/location/project-location.tsx; components/location/location.css; scripts/location-secret-scan.mjs; tests/location-loader.test.ts; tests/location-provider.integration.ts; README.md; this document.

Added: app/api/location/map-config/route.ts; lib/location/browser-map.ts; lib/location/map-config.ts; lib/location/maplibre-map.ts; lib/location/route-provider.ts; scripts/sync-map-assets.mjs; public/vendor/maplibre-gl.css; public/vendor/maplibre-gl-worker.mjs; public/vendor/maplibre-gl-shared.mjs; public/vendor/maplibre-LICENSE.txt.

Removed superseded adapters: lib/location/google-maps.ts and lib/location/google-routes.ts.

The original Phase 9 implementation inventory below is retained as historical context; superseded Google adapters are no longer current files.

## Original Phase 9 source inventory (historical)

Existing files:

```text
.env.example
README.md
QUALITY-AUDIT.md
components/account/account-portal.tsx
components/admin/workspace.tsx
components/platform/contact-form.tsx
components/platform/project-experience.tsx
lib/ai/catalog.ts
lib/ai/contracts.ts
lib/ai/provider-shared.ts
lib/http.ts
lib/services/projectService.ts
prisma/schema.prisma
```

Added files:

```text
app/admin/locations/page.tsx
app/admin/locations/[slug]/page.tsx
app/api/admin/locations/[slug]/route.ts
app/api/projects/[slug]/location/route.ts
app/api/projects/[slug]/location/route-estimate/route.ts
components/location/coordinate-fields.tsx
components/location/editor.css
components/location/location-editor.tsx
components/location/location-links.tsx
components/location/location.css
components/location/project-location.tsx
lib/location/admin.ts
lib/location/contracts.ts
lib/location/google-maps.ts
lib/location/google-routes.ts
lib/location/repository.ts
prisma/migrations/20260928090000_location_intelligence/migration.sql
scripts/location-live-check.ts
scripts/location-secret-scan.mjs
tests/location-loader.test.ts
tests/location-provider.integration.ts
tests/location.integration.ts
tests/location.test.ts
docs/PHASE-9-LOCATION-INTELLIGENCE.md
```
