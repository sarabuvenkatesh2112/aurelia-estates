# Phase 4 database and platform architecture

Neon PostgreSQL is the primary database. The application runs locally in Next.js; only explicitly authorized database queries and fictional seed/QA records are sent to Neon. No application source, assets or website have been uploaded or deployed.

## Run the project

Use Node 22.13+ (validated with Node 24) and install dependencies with `npm ci`. Copy `.env.example` to `.env.neon`, then supply your own Neon pooled `DATABASE_URL` and direct `DIRECT_URL`. Both must address the same Neon database. Do not paste credentials into tickets, chat or source files. `.env.neon` is ignored by Git.

```sh
npm run db:check
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. For the optimized local server, run `npm run build` followed by `npm start` and open `http://localhost:3001`. Phase 4 uses server rendering and route handlers, so the former `out/` static export is no longer its runtime. The existing Sites registration belongs to the earlier static project; publishing Phase 4 would require a separate, explicitly authorized Node-capable deployment configuration.

`scripts/database-env.mjs` chooses `.env.neon` by default. It validates the Neon target and enforces certificate-verified TLS. Prisma CLI migrations use the direct URL; the server's Prisma PG adapter uses the pooled URL with five connections, a five-second connection timeout and a thirty-second idle timeout. Hosted environments may inject these variables directly without an environment file. No secret is prefixed with `NEXT_PUBLIC_`. `scripts/database-task.mjs` reports connection outcomes and safe counts without forwarding credential-bearing driver diagnostics.

### Preserved local fallback

The existing local credentials remain in `.env`, and PostgreSQL's persistent cluster remains in `.local-postgres`. Nothing was removed or recreated. `npm run db:local` starts the actual local PostgreSQL server on loopback port 55432. In a separate PowerShell terminal:

```powershell
$env:DB_TARGET = 'local'
npm run db:check
npm run db:migrate
npm run db:seed
npm run dev:local
```

Use a separate terminal for the default Neon runtime, or clear `DB_TARGET` after local work. Local mode deliberately rejects remote URLs; Neon mode rejects a silent local fallback. `AURELIA_ENV_FILE` is an optional server-only override for isolated environment checks. Prisma generation can run without a connected database; migration, seeding and runtime reads require a configured target. `npm run db:studio` is a local developer tool, not an application admin dashboard.

## Schema, migration and seed

The preserved migration is `prisma/migrations/20260911050327_phase4_property_platform/migration.sql`. It was applied successfully to Neon. It creates **36 models**:

- Catalog: Developer, Location, Project, ProjectMedia, Tower, Floor, UnitType, Unit, UnitPriceHistory, UnitStatusHistory, ProjectStatusHistory, Amenity, ProjectAmenity, NearbyPlace, ProjectNearbyPlace.
- Business: Agent, Customer, CustomerRequirement, LeadSource, TrafficSource, Lead, LeadStatusHistory, LeadNote, SiteVisit, SiteVisitStatusHistory, Enquiry, BrochureDownload.
- Activity: UserEvent, PropertyView, ConversionEvent.
- Future account/CRM/AI foundations: FavoriteReady, SavedSearchReady, NotificationReady, AuditLogReady, AiConversationReady, AiMessageReady.

Projects belong to developers and normalized locations. Each project owns towers, each tower owns floors (including Ground), and units reference a project, tower, floor and configuration. Composite foreign keys prevent mismatched project/tower/floor/configuration membership. Decimal columns store rupees, fractional bedrooms and distances; presentation formats Lakhs/Crores and `en-IN` areas. UUIDs, unique slugs, timestamps, lifecycle enums and selective soft deletion establish the business boundaries. Database checks enforce nonnegative prices, valid area ranges and guest counts.

Indexes cover project slug, developer/location, stage/featured order and possession date; unit project/availability/price, numeric price, area and configuration; location city/locality; configuration bedrooms; and lead project/contact/time windows. Foreign-key join tables have unique relationship constraints. Search values are bound parameters, and SQL ordering uses only predefined fragments.

The deterministic seed creates **5 fictional developers, 8 projects, 16 towers, 48 released floors, 16 configurations, 96 units, 38 normalized amenities, 24 nearby relationships, 40 media records, 96 price histories and 96 unit status histories**. The eight original residences retain their identities, descriptions and photographic references. Repeated upserts preserve existing records rather than resetting live edits. Amenity relationships resolve the canonical slug's actual ID, fixing the initial case-variant seed failure. Each project's seed is transactional. The seed is not an inventory synchronization or destructive reset command.

The original `data/properties.ts` and `lib/discovery.ts` remain as migration provenance and legacy regression fixtures. Runtime homepage components, search, details, form choices and recommendations no longer import them. Phase 2 editorial storytelling and Phase 3's independent architectural concept remain intact.

## Data services and search

`lib/db/prisma.ts` owns the shared client. Server-only repositories own queries; services return serializable public DTOs without contact data or credentials. `ExperienceProvider` receives server-fetched project records so the existing cinematic components retain their animation structure.

`/residences` supports keyword, city, locality, property type, fractional BHK, min/max price, min/max area, project stage, unit availability, developer, possession-before date and multiple amenities. Zod validates numeric ranges, dates, enum values and pagination. Filter values live in URL parameters. Sorts are featured, newest, numeric starting price ascending/descending, largest area and possession date, with a stable ID tie-breaker. PostgreSQL performs filtering, aggregation and pagination, capped at 24 projects per page; the interface defaults to six. Counts are calculated in the same repeatable-read transaction as the page. City/BHK facets count catalog projects, not contextual counts for every active filter combination.

Unit constraints are applied together to the same unit. Price/area ranges come from matching released inventory (or the explicit availability filter). The starting-price card's BHK and representative area come from the same lowest-priced matching unit. Available counts derive from actual AVAILABLE units; no duplicated stored project price summary needs synchronization. Detail pages query current inventory, with twelve units per page. Historical and unreleased unit statuses remain explicit.

`/residences/[slug]` supplies dynamic metadata, a photographic reveal, gallery selection, configurations and schematic plans, towers/floors, inventory, amenities, illustrative nearby places, related database projects and contextual CTAs. Missing galleries use an identified mood reference; long text wraps; the inventory table scrolls within its own region on mobile. Malformed or missing projects show the designed not-found view. Next.js may return HTTP 200 after a streamed response has begun, while rendering its noindex/not-found boundary. Sitemap routes are derived from nonarchived projects and gracefully fall back to base routes when the database is unavailable. The fictional site remains noindex and contains no fabricated ratings.

The homepage collection is cached for 60 seconds; facets for five minutes. Search and detail inventory reads remain fresh. Mutations are never cached. Future authenticated admin mutations must invalidate the `catalog` cache tag; `changeUnitPrice` already provides an atomic price/history boundary and has no public mutation endpoint.

## Requests and events

`POST /api/enquiries` and `POST /api/visits` validate names, email, phone, project/unit membership, message length, future dates, allowed requested times and guest count. Bodies are size-limited, cross-origin browser submissions are rejected, and errors are sanitized. Forms disable submission while pending, retain an idempotency key across uncertain retries and expose success/error states. Contact information is explicitly disclosed as being stored.

A serializable transaction creates the request, associated lead, initial status histories and conversion event. The same idempotency key/payload returns the original record; a changed payload with the same key returns a conflict. Serializable/unique conflicts have bounded retries. Leads deduplicate by project plus normalized phone or lowercase email within 30 days. The first source is preserved when a later enquiry attaches to a visit lead. Enquiries and visit records remain separate, preserving request content. Visits are REQUESTED, never represented as confirmed slots. A honeypot and five-per-email/five-minute database check provide a modest spam foundation; there is no paid CAPTCHA or distributed public-edge rate limiter.

The collection guide parses structured preferences, calls the same database search and returns up to three matching projects with available units. It does not call an LLM or store conversation text. Related projects use shared city and property type. A local PDF brochure is generated from current project data and records a brochure event/download.

Anonymous events cover project/unit views, filtering/search activity, visit starts/submissions, enquiries, brochure clicks and assistant opening. Events have UUID deduplication keys. Allowed metadata is limited to counts; no IP, fingerprint, cookies, persistent session identifier, prompt text or contact fields are collected in anonymous events. Traffic source and UTM-ready schema fields exist for future campaigns. Browser QA creates clearly fictional request records, which are identifiable by `example.test` addresses; these are not real leads or confirmed appointments.

## Validation and deferred scope

See `QUALITY-AUDIT.md` for exact executed checks and limits. `npm test` runs twelve local domain/validation/model regressions. With the local web server running and explicit `ALLOW_DB_TESTS=true`, `npm run test:db` checks the real configured PostgreSQL database and HTTP API, including idempotency, lead reuse and relational writes. It deliberately creates fictional QA requests. `tests/edge-fixture.ts` creates/removes only its fixed temporary QA identity for browser layout testing.

Authentication, account-backed favorites/saved searches, CRM/admin UI, real AI, WhatsApp, live maps, payment processing, campaign dashboards, real availability scheduling, notifications and production deployment are deferred. The schema-ready tables do not fabricate a signed-in user or expose unfinished account actions. Physical-device/cross-browser and public-load testing remain future validation work.
