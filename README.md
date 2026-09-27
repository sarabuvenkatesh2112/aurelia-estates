# Aurelia Estates

A cinematic luxury real-estate portfolio concept, built as the frontend foundation of a future property platform. Phase 1 established the art direction, accessible interactions and data model. Phase 2 adds the finished cinematic motion system. Phase 3 adds an original Blender model and a scroll-directed interactive architectural journey while preserving that foundation. Phase 4 completes the database-backed property platform with Neon PostgreSQL, dedicated project pages, advanced discovery and persisted requests. Phase 5 completes authenticated customer accounts, persistent private collections and account-owned visit/enquiry requests. Phase 6 completes the secure Aurelia Private Office, staff roles, CRM, visit operations, inventory workflows and audit trail.

**Aurelia Estates is fictional.** Listings, developers, prices, dates, distances, brand statistics and testimonials are illustrative. Photography is architectural mood imagery and does not depict the listed residences. Visit and enquiry forms now store submitted contact details and requests in Neon. Public submissions remain requests until an authorized staff member explicitly confirms them.

## Phase 1 (original scope)

- Full-screen architectural hero with a wordmark prelude, coordinated GSAP reveal, subtle pointer depth and magnetic primary action.
- Responsive desktop navigation and a choreographed mobile menu with focus management and Escape dismissal.
- Eight typed residences across Hyderabad, Visakhapatnam, Bengaluru, Goa, Chennai and Pune.
- Working local filters for location, property type, bedrooms and maximum price; combined filters, clear and empty states.
- Large residence cards with a desktop ScrollTrigger horizontal sequence, direct mobile swiping and shared-image Motion layout IDs for detail panels.
- Five-scene pinned story: architecture, craft, lifestyle, connectivity and private living. Stacked scenes on mobile and reduced motion.
- Asymmetric signature developments, animated concept statistics, interactive locations, amenities, sample resident perspectives and an editorial journal.
- Aurelia AI local preview: deterministic intent parsing for city, BHK, property type and budgets in Crores or Lakhs. Recommendations come from the same property dataset.
- Validated demo visit/advisor forms, newsletter preview, social and legal concept panels.
- Responsive WebP photography at 640, 1,200 and 1,800 pixels, local static image loader and lazy loading. The hero is prioritized; the opening story image is eager, with the remaining editorial imagery lazy-loaded.
- Static export with local demo interactions; no backend, database, authentication, maps, real AI or WhatsApp integration.

## Stack

Next.js 16.3.4 with App Router, React 19, TypeScript, Tailwind CSS 4, Motion for React, GSAP + ScrollTrigger, Lenis, Lucide React, Three.js 0.182.0, React Three Fiber and Drei. Prisma 7, the PostgreSQL adapter, Neon PostgreSQL and Zod provide the server data layer. Better Auth and Argon2id provide customer authentication and password hashing. Base UI supplies accessible dialog/select primitives. Oxlint and Oxfmt handle linting and formatting. Exact installed versions are recorded in `package.json` and `package-lock.json`.

## Local setup

Use Node.js 22.13 or newer and npm. Node 24 was used for validation.

```sh
npm ci
npm run db:generate
npm run db:check
npm run dev
```

Preserve the existing ignored `.env.auth` authentication secret; a fresh checkout also needs the one-time [authentication setup](docs/PHASE-5-CUSTOMER-PORTAL.md#local-setup). Never print or commit its value.

Before starting, configure the ignored `.env.neon` with your Neon pooled `DATABASE_URL` and direct `DIRECT_URL`. The current workspace is already migrated and seeded; do not reset it. For a fresh database, follow [database setup](docs/PHASE-4-DATABASE.md). Open http://localhost:3000. The original local PostgreSQL database remains an explicit development/testing fallback (`npm run db:local`, then `npm run dev:local`). Never overwrite its `.env` with Neon credentials. Before using Phase 5 or Phase 6 against that fallback, apply its pending additive migrations explicitly in local mode. The working local cluster and credentials are preserved.

```sh
npm run build
npm start
```

`npm start` runs the optimized Next.js server at http://localhost:3001. Phase 4 requires server rendering and API routes; the earlier `out/` static export is historical and is not the current runtime. Nothing has been deployed.

## Scripts

| Script                             | Purpose                                              |
| ---------------------------------- | ---------------------------------------------------- |
| `npm run dev`                      | Next development server on port 3000                 |
| `npm run build`                    | Typecheck and build the Next.js application          |
| `npm start`                        | Run optimized Next.js server on port 3001            |
| `npm run typecheck`                | TypeScript validation                                |
| `npm run lint`                     | Type-aware lint and accessibility rules              |
| `npm test`                         | Domain regression, camera and GLB integrity tests    |
| `npm run test:admin`               | Opt-in full staff/CRM integration suite               |
| `npm run test:admin:final`         | Focused saved-fixture permission/isolation checks     |
| `npm run staff:bootstrap`          | Explicitly authorized local staff bootstrap           |
| `npm run test:auth`                | Opt-in authentication and cross-account API tests   |
| `npm run test:db`                  | Opt-in real PostgreSQL/API integration tests         |
| `npm run db:check`                 | Verify pooled/direct database connections and TLS    |
| `npm run db:migrate`               | Apply existing migrations to the selected database   |
| `npm run db:seed`                  | Upsert fictional inventory, preserving edits         |
| `npm run db:generate`              | Generate Prisma client                               |
| `npm run db:local`                 | Start the preserved local PostgreSQL fallback        |
| `npm run dev:local`                | Start Next explicitly against the local fallback     |
| `npm run format -- --write`        | Format source                                        |
| `node scripts/optimize-images.mjs` | Regenerate local WebP variants from source JPG files |

On Windows, use `npm.cmd` if your PowerShell execution policy prevents running `npm.ps1`.

## Structure

```text
app/                         App Router pages, API handlers, metadata and design tokens
components/platform/         Collection, project gallery/inventory and persisted forms
lib/repositories/            Server-only database queries and transactions
lib/services/                Public DTOs, search and cache boundaries
lib/validation/              Zod request and query contracts
prisma/                      Preserved schema, migration and deterministic seed
components/animation/        Lenis/GSAP lifecycle, cursor and magnetic interaction
components/layout/           Navigation, footer, shared panel state and dialogs
components/sections/         Hero, discovery, pinned story and editorial sections
components/property/         Reusable residence card
components/ui/               Small set of shared accessible primitives
components/three/            Lazy architectural scene and model interactions
hooks/                       Scoped motion, scene progress and pointer hooks
lib/scene-config.ts          Camera checkpoints, floors and hotspots
assets/blender/              Editable original source and asset metrics
public/models/               Local GLB and matching still
docs/                        Phase 3 motion/model and Phase 4 database architecture
lib/discovery.ts             Preserved legacy regression/seed provenance
lib/image-loader.ts          Static responsive image routing
lib/utils.ts                 Class composition helper
data/properties.ts           Original eight records retained as seed provenance
data/editorial.ts            Scenes, destinations and sample testimonials
types/property.ts            Shared domain contracts
public/images/               Local source photos and optimized variants
scripts/                     Image utilities, secure database tasks and local fallback
tests/                       Deterministic domain behavior checks
.openai/hosting.json          Historical static registration; no Phase 4 deployment
```

## PHASE 2 — COMPLETE

Completed and audited locally on 9 September 2026. No source upload or deployment was performed. The existing Phase 1 sections, fictional property collection, filters, forms and frontend-only boundaries remain intact.

### Three signature interactions

1. **A continuous cinematic arrival.** Individually revealed wordmark letters move toward the navigation identity as split curtains uncover the architecture. Masked headline lines and supporting controls arrive in sequence. Separate image, atmosphere, pointer and content layers then transform the hero into the discovery section during scroll.
2. **The residence journey.** A pinned, scroll-driven horizontal collection changes the dominant residence with restrained image depth, metadata emphasis, image shading, a progress line and four direct stops. Mouse dragging, previous/next controls and keyboard card focus use the same scroll positions. Search results transition into an animated grid. Narrow screens and reduced motion use a native horizontal rail.
3. **Five chapters of living.** Architecture, Craft, Lifestyle, Location and Private Living share one reversible pinned timeline. Vertical reveals, aperture masks, lateral movement and a final garden reveal create distinct transitions. Chapter names, progress and clickable navigation stay synchronized; the fallback presents all five chapters as readable document content.

### Motion architecture

`lib/motion/config.ts` defines easing, durations, stagger intervals, springs, pointer limits and media queries. `lib/motion/choreography.ts` supplies the editorial typography and image-reveal vocabulary. `app/motion.css` contains the layered scene styling, reversible panel/menu keyframes and accessibility overrides.

`useMotionScene(scope, build, revision)` owns a scoped GSAP matchMedia context. React 19's `useEffectEvent` lets media callbacks read current references without rebuilding a timeline on every active-chapter update. A changed revision rebuilds the residence sequence after switching between the rail and filtered results. Every context reverts its animations and ScrollTriggers; custom listeners, observers, pending frames, drag handlers and ticker callbacks have explicit cleanup. The hero handles React's development effect replay without losing its entrance.

`MotionEngine` owns the single Lenis instance, driven by the GSAP ticker and synchronized with ScrollTrigger. It runs only on sufficiently large, fine-pointer screens without reduced motion. Dialogs retain native scroll locking and internal scrolling. Named triggers (`hero-transform`, `residences`, `living-story`, `reading-progress`) support reliable navigation and progress. Pinning requires at least 1,000px width and 650px height. Resize and preference changes remove the enhancement cleanly; no global `killAll()` is used.

GSAP owns long-form scroll scenes and editorials. Motion owns property image layout IDs, the assistant surface morph, magnetic spring values, filter layout changes, destination/amenity image transitions, recommendation entrance and testimonial changes. Each independent transform has its own wrapper to avoid fighting between scroll, hover and layout animation.

`ExperienceProvider` separates the selected panel from its open state. The panel stays mounted through its closing animation and clears only after Base UI reports that closing has finished. This preserves focus trapping, Escape dismissal and focus return while allowing reversible masks, heading reveals and staggered visit fields. Assistant timers are cancelled when the assistant unmounts. At Phase 2 completion forms and recommendations used local data only; Phase 4 connects them to the server data layer.

### Pointer, images and interactive editorials

`CursorSystem` uses one GSAP ticker with delta-time exponential interpolation, cached setters and a single contextual cursor. It inspects the actual element under the pointer after movement, scrolling, resize, relevant DOM changes and selection changes. Default, View, Explore, Drag, Discover and Open states are supported; inputs and selected text suppress the ornament. Pointer exit, window blur, visibility changes and teardown clear it. The native pointer remains available. The custom cursor is disabled below 1,000px, for coarse/touch pointers and for reduced motion.

A single trailing image preview belongs to the development titles. Its position is clamped to the viewport and it clears when the pointer leaves that context. Magnetic buttons have separate outer-button and inner-label springs, bounded displacement and leave/blur/resize reset.

`CinematicImage` provides horizontal and vertical clip reveals for destinations and amenities. Destination tabs retain roving keyboard navigation and now synchronize collection counts and illustrative connectivity details. Six amenity selections animate their copy, active rule and image. Statistics animate with Indian number formatting and stable currency/suffix labels. A fixed two-pixel reading line follows the whole document.

### Responsive, reduced-motion and performance strategy

The mobile experience uses native scrolling, a swipeable residence rail, stacked story chapters, a sticky chapter navigator and a reversible full-screen menu. Pointer-only effects are absent. Full-motion behavior follows the system preference; a footer **Reduce motion** control also lets a visitor opt out for the current page session. A system request for reduced motion cannot be overridden by that control.

Reduced mode removes the preloader, Lenis, cursor, ambient movement and pinning. Dialogs, filters, chapter navigation, location tabs, amenities and all local forms continue to work. The footer control does not use storage or transmit a preference.

Per-frame work uses GSAP setters or Motion values, not React state updates. React state changes only when the active residence/chapter changes. Pointer layout bounds are read on entry, contextual hit testing is marked dirty by events, and the preview uses the same ticker as the cursor. Slow ambient hero movement pauses when the hero leaves the viewport. Large motion uses transforms/opacity, with clip-path reserved for the signature reveals. Local responsive WebP variants, lazy loading keep media and runtime costs bounded.

`HeroVisual` and `StoryVisual` retain replaceable React children for later media work. Phase 3 now supplies the architectural 3D experience. Phase 4 now supplies property routes and the database backend. Phase 5 now supplies customer authentication; real AI remains a later phase.

The original assistant boundary was `recommendProperties(prompt): Recommendation`. The Phase 4 database-backed parser supports city names (including Vizag), BHK/bedroom counts, property type and `under`, `below`, `up to` or `budget` amounts expressed in Cr/Crore/Lakhs. It is not a language model: unsupported requests receive a transparent collection fallback. The future flow is intent extraction → data query → ranking → recommendation → lead capture → visit.

## PHASE 3 - COMPLETE

Completed and audited locally on 10 September 2026. The final continuation resolved tablet copy/model separation and crowded mobile fallback controls. Existing Blender geometry, camera checkpoints, floor selection, hotspots, handoffs and Phase 2 interactions were preserved.

### Three signature interactions

1. **Photograph-to-architecture arrival.** A masked continuation of the hero image reveals the original model; its matching transparent still stays underneath loading and failure states.
2. **A six-part architectural journey.** One reversible scroll clock coordinates Arrival, Approach, Architecture, Residences, Lifestyle and Exit, with restrained camera depth, contextual hotspots and selectable Levels 18/22.
3. **Architecture-to-collection handoff.** The first residence photograph wipes over the scene and contracts into the page margins before discovery and the existing Featured Residences sequence.

The saved [Blender source](assets/blender/aurelia-residence.blend) exports a self-contained **2.07 MB GLB with 25,216 triangles, 30 mesh objects and 12 materials**. Refined balcony glazing, bronze facade details, layered foliage and a small environment capture complete the presentation. The matching WebP fallback is approximately 47 KB.

The scene loads near the viewport, renders on demand and suspends offscreen work. Desktop uses bounded DPR with adaptive reduction; smaller screens use native scrolling and lighter rendering. Tablet framing reserves space for copy. Mobile fallback places copy, image, feature controls and navigation in normal document flow. Loading errors retain usable HTML information and local visit actions.

See [the animation architecture](docs/PHASE-3-ARCHITECTURE.md), [camera storyboard](docs/PHASE-3-STORYBOARD.md) and [final audit](QUALITY-AUDIT.md#phase-3-final-audit). TypeScript, lint, seven regression tests and the production static export pass. Actual Chromium checks cover eight viewport widths, forward/reverse scrolling, model loading, floors, hotspots and a deliberately failed model request. Physical-device and cross-browser performance remain unverified. Nothing was published or uploaded.

## PHASE 4 - COMPLETE

Completed and audited locally on 12 September 2026. Neon PostgreSQL is the primary database; the existing local PostgreSQL setup remains available as an explicit fallback. Completed Phase 2 motion and Phase 3 Blender, camera and interaction work were preserved.

- **Real property discovery:** database-backed homepage, URL-based combined filters, numeric sorting and pagination across eight projects. Matching unit price, BHK and area stay consistent.
- **Dedicated project pages:** responsive photographic hero, selectable gallery, configuration diagrams, towers/floors, current unit inventory, amenities, nearby places, related residences, metadata, sitemap and generated PDF brochures.
- **Persisted requests:** validated visit and enquiry forms create requests, deduplicated leads, status histories and conversion records transactionally. Idempotent retries avoid duplicate submissions. Success means stored request, not confirmed appointment.
- **Shared data architecture:** 36 Prisma models, one applied migration, 5 developers, 8 projects and 96 units. Neon pooled/direct connections and TLS were verified. The deterministic collection guide queries the same inventory without an AI API.
- **Final polish:** mobile long-title wrapping and contrast, missing-gallery fallback, large prices and amenity lists, empty inventory/search states, controlled database errors and mobile form scrolling.

TypeScript, lint, twelve local regressions, all six PostgreSQL/API integration cases and the production build passed. Actual Chromium interactions verified search, project gallery, recommendations and request persistence. Responsive checks cover 360, 390, 430, 768, 1024, 1366, 1440 and 1920px. The final browser console was clear; a client-bundle scan found no configured Neon credentials. See [the final audit](QUALITY-AUDIT.md#phase-4-final-audit) and [database architecture and setup](docs/PHASE-4-DATABASE.md).

No blocking application issue remains in the executed checks. A nonfatal PostgreSQL driver query-queuing deprecation notice remains on the server; physical-device, Safari/Firefox and public-load testing remain unverified. No source, assets or website were published or uploaded.

## PHASE 5 - COMPLETE

Implementation verified on 13 September 2026; final documentation and hotspot browser cleanup closed on 14 September 2026. Neon remains primary, and the existing local PostgreSQL fallback and Phase 1-4 functionality are preserved.

- **Private customer portal:** sign-up/sign-in/sign-out, server-protected account pages, editable name/phone, shortlist, saved searches, visit history and enquiries.
- **Persistent collections:** duplicate-safe favourites, saved-search rename/removal, and restoration of real URL filters after reload and sign-in.
- **Personal request flow:** a four-step Schedule a Visit experience with session-prefilled details, project/configuration/unit selection, IST date/time validation, review and reference-number confirmation. Enquiries and visits receive ownership from the server session. A stored request is not a confirmed appointment.
- **Security and validation:** Better Auth, Argon2id, database sessions, strict shared schemas, same-origin mutations and per-customer repository filters. Cross-account access and mass assignment are rejected; expired sessions cannot silently submit as guests.
- **Preserved data:** one additive Phase 5 migration, four new authentication models and 40 Prisma models total. No repeat migration, reset or hosted reseed was needed during final cleanup.

TypeScript, lint, production build, 18 local regressions, six authentication integration groups and six database integration cases passed across the completed runs and focused reruns. Actual Chromium checks cover account/auth, collection, project and homepage layouts at 360, 390, 430, 768, 1024, 1366, 1440 and 1920px. The final hotspot CSS was browser-verified at 768/1440px (11px labels, 44px targets, no clipping) with a 360px mobile regression check.

See [the complete Phase 5 architecture and setup](docs/PHASE-5-CUSTOMER-PORTAL.md) and [the consolidated final audit](QUALITY-AUDIT.md#phase-5-final-audit). No blocking regression was observed from the last hotspot adjustment. Known nonfatal driver/shader warnings and device/production-hardening limits are recorded in the audit. Phase 5 is closed; the completed Phase 6 extension is documented below.

## PHASE 6 - COMPLETE

Closed locally on 19 September 2026 after the final audit/filter checks and verified removal of temporary browser QA staff access. Neon remains primary. Existing migrations, local PostgreSQL fallback, customer accounts, records and Phase 1-5 functionality are preserved.

- **Secure private office:** separate staff sign-in and protected page/API routes reuse Better Auth, Argon2id and database sessions. Active staff membership is checked server-side. SUPER_ADMIN, ADMIN, SALES_MANAGER, SALES_AGENT and VIEWER have distinct permissions; agents are scoped to assigned relationships and viewers receive redacted summaries.
- **CRM and customer context:** searchable, paginated lead list/pipeline; lead creation, stage/priority/budget updates, assignment, authored private notes and follow-ups. Customer detail links show profile basics, related requests and shortlist context. Customer-submitted contact/message fields remain intact.
- **Operational visits and enquiries:** controlled lifecycle transitions, separate confirmed schedules, rescheduling history, cancellation/completion/no-show guards and customer-safe projections. Version checks and serializable transactions reject concurrent stale edits.
- **Inventory and accountability:** protected price/status edits retain old/new values and actor references. Live analytics support bounded date ranges and zero-result states. Database-enforced append-only audit records cover significant changes.
- **Additive data architecture:** 42 Prisma models and three applied migrations. The Phase 6 migration was applied once. The marketed collection remains eight projects and 96 units; additional QA inventory is archived and excluded from public listings and filter facets.

TypeScript, lint and production build pass. Completed verification includes 22 local regressions, authentication/database regression suites, role/IDOR/concurrency/lifecycle tests, 64 admin layout checks across eight widths, actual browser workflows, and the final four-result cleanup integration run. The client-bundle scan found zero configured secret matches. The temporarily elevated browser QA membership is disabled; its existing session is denied the admin workspace while retaining normal customer access.

See [the complete Phase 6 architecture, role matrix and routes](docs/PHASE-6-ADMIN-CRM.md) and [the consolidated final audit](QUALITY-AUDIT.md#phase-6-final-audit). No blocking failure remains in the executed local checks. Known operational and device-testing limits are recorded there. Nothing was published or uploaded.

## Content and privacy

Customer profiles, password hashes, database sessions, favourites and saved searches persist in Neon. Staff memberships, assignments, private CRM notes, follow-ups and operational audit records also persist with server-enforced access controls. Necessary authentication cookies maintain the signed-in session; email and phone are not represented as verified. Submitted visit/enquiry contact details, request content and lead/status histories persist in Neon. Anonymous interaction events and brochure downloads are also recorded with restricted metadata; events do not collect contact fields, IP addresses, fingerprints, cookies or persistent session identifiers. Assistant prompt text stays in transient frontend/server processing and is not stored as conversation history. Newsletter signup remains a local preview. The domain `aurelia.example` is an intentional placeholder. Use fictional details when testing this local concept.

Prices use Crores/Lakhs and `en-IN` area formatting. Distances and possession dates are concept metadata, not verified commercial information. Search applies price, area, configuration and availability constraints to matching database units.

## Photography credits

Photos are used under the [Unsplash License](https://unsplash.com/license). They are mood references only.

| Asset               | Photographer        | Source                                  |
| ------------------- | ------------------- | --------------------------------------- |
| Hero villa          | Avi Werde           | https://unsplash.com/photos/hHz4yrvxwlA |
| Private villa       | John Fornander      | https://unsplash.com/photos/y3_AHHrxUBY |
| Exterior            | Florian Schmidinger | https://unsplash.com/photos/b_79nOqf95I |
| Interior            | Roberto Nickson     | https://unsplash.com/photos/rEJxpBskj3Q |
| Pool                | Lefteris Kallergis  | https://unsplash.com/photos/ewSBvLSp3Tc |
| Garden              | Drew Coffman        | https://unsplash.com/photos/wH1ykpPWwzI |
| Residential setting | Daniel Barnes       | https://unsplash.com/photos/RKdLlTyjm5g |

## Validation

See [QUALITY-AUDIT.md](QUALITY-AUDIT.md) for the executed checks and their practical limits. Automated domain tests cover combined filtering, no matches, Indian budget parsing, assistant result selection, unique records and price formatting. Browser checks cover the rendered experience and local interactions; these are not a substitute for future cross-device performance testing.

## Roadmap

| Phase | Scope                                                              |
| ----- | ------------------------------------------------------------------ |
| 2     | COMPLETE — cinematic motion, transitions and interaction audit     |
| 3     | COMPLETE - original Blender + interactive architectural journey    |
| 4     | COMPLETE - property platform, Neon/Prisma, discovery and requests  |
| 5     | COMPLETE - authentication, customer portal and private collections |
| 6     | COMPLETE - secure staff CRM, visits, inventory and audit trail     |
| 7     | COMPLETE - Gemini concierge, grounded tools and private actions    |
| 8     | WhatsApp Business + CRM communications — local verification; live Meta pending |
| 9     | Google Maps and subsequent integrations                            |
| 10    | Analytics, expanded testing, performance and production deployment |

Before real-world use, replace all fictional content, review regulatory and privacy requirements, validate factual property information and perform cross-browser/device and load testing. Server-side validation is implemented; public deployment and operational production hardening remain future work.


## PHASE 7 - COMPLETE (LOCAL VERIFICATION)

Closed on 22 September 2026. The concierge uses Google's official `@google/genai` SDK with `gemini-3.1-flash-lite`. Configure the server-only `GEMINI_API_KEY` in ignored `.env.local`; `AURELIA_GEMINI_MODEL` is optional. OpenAI remains inactive, with no automatic fallback or paid-billing requirement.

Real Gemini search, comparison, remembered filters, guest privacy and authenticated collection retrieval passed against Neon. Explicit shortlist add/remove, saved-search create/reopen, account isolation, malformed action rejection, visit/enquiry review safety and real HTTP cancellation passed. Live tests rejected unknown properties, unsupported private-pool/return claims, credential/staff-data instructions and pasted fake tool results. An impossible budget returned no matches without broadening.

The comparison fix consumes a single bounded streaming tool loop and publishes only a fully validated final answer. It no longer discards a completed model answer and requests another generation. Function signatures stay request-local, and safe error-stage codes improve diagnosis without exposing SDK payloads. Conversation leases and cancellation safeguards remain intact.

Final TypeScript, lint, production build, 31 local regression tests and six HTTP sanity checks passed; the five previously passed provider-protocol tests were retained. The PostgreSQL closeout additionally passed four focused database checks on each of Neon and the local fallback, plus ten affected concierge integration tests. Production client scan: 32 files, zero configured credential matches. The eight-width responsive baseline is retained, with final live-comparison checks at 360, 768 and 1440px and a post-fix mobile live-search replay. Existing Neon inventory (8 public projects, 96 units), one applied migration and local PostgreSQL fallback are preserved; temporary staff access remains disabled and audit-created shortlist/search items were removed.

The PostgreSQL query-queuing warning is fixed: Prisma relation reads inside one transaction now use a transaction-local async queue before reaching the single pg client. Pool concurrency, transaction isolation, errors and cleanup are preserved; neither warning suppression nor a dependency downgrade was used. A fresh real Gemini browser search returned six units whose references matched fresh Neon reads after the fix.

Known limits: free-tier/provider availability, finite model safety coverage and the existing gallery image-priority notice. Physical devices, other browsers and production abuse/load hardening are outside this local closure. The retained local fallback currently has an empty catalogue; connection, schema reads, temporary writes, rollback and pool cleanup were verified without seeding it. See [architecture/configuration](docs/PHASE-7-CONCIERGE.md) and [the detailed final audit](docs/PHASE-7-AUDIT.md). No credentials were exposed and nothing was published or uploaded.

## PHASE 8 - LOCAL IMPLEMENTATION VERIFIED; LIVE META PENDING

Reconstructed from clean `main` at `abb702d` on 26 September 2026. The checkpoint and both Antigravity QA commits are preserved. The existing WhatsApp migration is applied once; this continuation ran no migration, reset or seed. Neon pooled and direct reads both succeeded; the pooled runtime and local PostgreSQL fallback remain unchanged.

The private Communication Center includes inbox/history, unread/latest state, filters, assignments, exact CRM relationships, consent, reviewed replies, approved-template rules and staff-requested Gemini drafts. Five-role RBAC and cross-agent boundaries are enforced server-side. STOP pauses communication, human takeover invalidates AI drafts, delivery history is append-only, and uncertain sends are never automatically retried. Small closeout fixes cover exact customer linking, late failed-status events, draft-preserving refresh, mobile form spacing, browser-origin handling and verification-token log protection.

Final verification passed: four unit tests, nine focused integration tests, same/cross-origin HTTP checks, TypeScript, lint, production build, sixteen inbox/detail width checks, and six read-only HTTP sanity checks. The built client/public scan checked 34 client files and 32 public assets with zero credential matches. QA messages use synthetic business IDs and private paused threads; no new business requests were created. See [Phase 8 architecture, audit and live boundary](docs/PHASE-8-COMMUNICATIONS.md).

**Phase 8 is not fully complete:** real Meta send/receive and signed live delivery status are unverified. The user completed callback verification/subscription manually, but last reported test-number provisioning pending. Missing server settings: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `META_APP_SECRET`. `WHATSAPP_VERIFY_TOKEN` is present. No tunnel hostname was hardcoded, and nothing was deployed, published or pushed.
