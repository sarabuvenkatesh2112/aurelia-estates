# Phase 9 — Location intelligence

## Saved-state continuation and status

Local implementation, automated verification and the final shared visit-control browser check are finished. Live Gemini positive/negative location checks passed on 29 September after the user replaced the key locally and restarted the development server. Google Maps credentials are absent; no live Google Maps/Routes result has been claimed. Nothing was published, deployed, uploaded or pushed.

The Google-specific status is: **Phase 9 local implementation complete; live Google Maps verification pending.** The separate live Gemini location verification is now complete.

Phase 8 status is unchanged: **Phase 8 local implementation complete; live Meta verification pending due to external test-number provisioning.** No Meta retry was attempted.

## Architecture and data

- Reuses `Location`, `Project`, `NearbyPlace`, `ProjectNearbyPlace`, the public catalogue repository, existing staff inventory permission and append-only audit records. No parallel search, staff authentication or project-management system was introduced.
- The additive `20260928090000_location_intelligence` migration was applied to Neon during the initial Phase 9 continuation. It was not rerun during final verification. Existing public projects and units were preserved; no reset, truncate or reseed was performed.
- Project fields: public address, map label, exact-site latitude/longitude, editorial narrative, source, verification timestamp and optimistic location version. Project coordinates have database pair/range constraints. Existing locality coordinates remain distinct from an exact site pin.
- Nearby relationships gain a source, context note and verification timestamp. Restaurant and park categories supplement existing categories. Original fictional records remain illustrative; no factual addresses, coordinates or commute figures were invented.
- The local PostgreSQL cluster and configuration are untouched. Apply pending additive migrations explicitly in local mode before using Phase 9 against that fallback; this closeout does not claim the local fallback was migrated or retested.

## Public location and Google boundaries

`lib/location/contracts.ts` validates coordinates, slugs, editorial inputs and safe Google Maps URLs. `repository.ts` projects only public project/location fields. Archived/deleted projects are excluded. A nearby record requires a non-illustrative flag, source and verification timestamp within 180 days before its stored distance/time can appear. Unverified or expired numbers are returned as `null`, not zero. Exact-site directions require verified project coordinates; otherwise only a clearly labelled locality search link is exposed.

`google-maps.ts` loads the official Maps JavaScript script once, only after the user requests an interactive map on a verified location. There is no homepage/global Google script. The component removes marker listeners and map listeners on unmount, uses cooperative gestures with wheel zoom disabled, and keeps a fixed responsive map area. Missing key, script failure, authentication failure and a 12-second loading timeout retain the textual fallback. Advanced markers use the Google demo map ID for local testing; configure an owned map ID before any future production rollout.

`google-routes.ts` calls only the official Routes API with server-selected stored coordinates, a restricted response field mask and an eight-second timeout. The public endpoint accepts only a project slug and a nearby-relationship UUID belonging to that project. It accepts no URL, free-form address, origin coordinates or Google query. Both points must be verified. Concurrent calls for the same pair are coalesced for 30 seconds; the process-local request cooldown and map are bounded. This is local protection, not a claim of distributed production quota enforcement.

Routes are driving estimates without traffic, explicitly attributed to Google with a retrieval time. Stored editorial estimates remain separately labelled. No geocoding, Places discovery, scraped data, straight-line distance approximation, or permanent storage of Google route content is used. Missing/restricted/quota/invalid/malformed/timeout responses become a safe unavailable state without raw provider diagnostics or credentials.

Official API references used during implementation:

- [Maps JavaScript loading](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- [Routes API](https://developers.google.com/maps/documentation/routes/compute_route_directions)

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

## Verification record

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

Configure locally; never paste values in chat:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — intentionally browser-visible; restrict it to Maps JavaScript API and authorized HTTP referrers.
- `GOOGLE_MAPS_SERVER_API_KEY` — server-only Routes key; API-restrict it and never expose it through a public variable.
The existing server-side `GEMINI_API_KEY` was corrected locally and both live Gemini checks passed; it is no longer a pending configuration requirement.

After credentials are supplied, verify actual map loading/markers and Routes responses using genuinely verified site/nearby coordinates. The fictional seed does not provide verified exact-site pins; a valid Google key alone must not turn concept data into factual site directions.

## Exact source files changed in Phase 9

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
