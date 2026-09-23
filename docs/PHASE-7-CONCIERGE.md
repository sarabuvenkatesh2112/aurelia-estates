# Phase 7 — AI property concierge

**Phase 7 completed in the requested local scope on 22 September 2026.** Real Gemini search, comparison, remembered filters, authenticated tools, safety/action checks, cancellation and final build verification passed. The dated [audit](PHASE-7-AUDIT.md) preserves earlier checkpoints and the final closure evidence. Nothing was deployed or uploaded.

## Architecture

The existing Next.js application, Better Auth sessions, Prisma repositories, Neon database and local PostgreSQL fallback are preserved. The public server interface remains `providerReady` / `runConcierge` in `lib/ai/provider.ts`. Its active adapter is `gemini-provider.ts`, using Google's official `@google/genai` SDK (2.23.0), the Gemini Developer API and `gemini-3.1-flash-lite`. Shared instructions and tool declarations live in `provider-shared.ts`. The prior OpenAI adapter is retained separately, inactive, with no automatic fallback. The legacy `AURELIA_AI_MODEL` setting cannot accidentally select an OpenAI model for Gemini.

Gemini receives the existing strict tool JSON schemas. Server-side Zod validation and Neon retrieval remain authoritative. Generation has no automatic retries, a 45-second per-request timeout, a 75-second total abort signal, four model rounds and a six-tool-call cap including rejected calls. All model rounds use the streaming endpoint. Parts, function calls, IDs and thought signatures are preserved in order; the terminal STOP response is validated and emitted once. Intermediate tool prose and partial failed responses are buffered rather than presented as completed answers. There is no second generation of already-completed prose. The adapter preserves function-call IDs and thought signatures only in request-local model history, excludes thought text from browser output, and validates the complete final prose buffer, bounded to 2,000 characters. Recent context remains bounded to twelve messages, structured preferences and eight prior residence references. Keys remain server-only; raw SDK errors, headers and URLs are not logged or emitted. Safe error metadata contains a fixed stage plus a classified code/status: connection, transport/timeout, stream, finalization or tool-limit failure. It contains no raw request or SDK payload.

The interface is dynamically imported when the existing assistant panel opens. A fixed launcher also exposes it on pages using the existing experience shell. Desktop uses a narrow side panel; mobile uses the available full-height viewport. The composer stays outside the internal scroll area. Conversation history, new/rename/delete controls, verified cards, comparisons, remembered filters, action feedback and a stop control are implemented. Plain React text rendering prevents model-supplied HTML or clickable arbitrary URLs.

## Configuration and provider boundary

- Required active-provider server variable: `GEMINI_API_KEY`.
- Optional server variable: `AURELIA_GEMINI_MODEL` (default `gemini-3.1-flash-lite`).
- Next.js loads the ignored `.env.local` into the server environment; the adapter also supports the separate ignored `.env.ai` file. `.env.example` documents names with an empty key.
- Never use a `NEXT_PUBLIC_` key, put credentials in browser storage, commit them, or paste them into a conversation.
- Without a key the API returns a controlled unavailable response; the UI offers the ordinary collection. It does not generate a simulated successful answer. A missing-key request creates no assistant message and no lead.

References: [Google function calling](https://ai.google.dev/gemini-api/docs/function-calling), [model capabilities](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite), and [free-tier pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-flash-lite). No paid billing was enabled. Free-tier quotas depend on the configured account. Google documents free-tier content use for product improvement; these local audits use fictional catalogue/QA data.

Both environment loading and the running server reported Gemini readiness without revealing key values. No restart was necessary for the initial provider switch; the stopped local dev server was restarted on 22 September to resume final verification. OpenAI's earlier `429 credit_balance_exhausted` is historical; OpenAI was not retried after the switch.

## Database and ownership

`lib/db/prisma.ts` uses `SequencedPrismaPg` from `lib/db/sequenced-pg.ts` around the existing official adapter. Prisma's nested relation loader can issue concurrent `queryRaw` operations inside one awaited repository call. A transaction owns one physical pg client, so the wrapper sequences its reads, writes, savepoints and finalization. It drains prior work before releasing the client, preserves individual failures, allows rollback after an error, and prevents a second release. Each transaction has an independent queue; ordinary pool queries and separate transactions retain concurrency. Pool limits/timeouts, isolation levels, connection ownership and `$disconnect()` disposal remain with the official adapter. No SQL, parameters, credentials or raw connection errors are logged by this wrapper. This fixes the pg 8.23 query-queuing deprecation without patching dependencies, suppressing warnings, removing the snapshot transaction or changing catalogue semantics.

The existing `AiConversationReady` and `AiMessageReady` placeholders were extended rather than replaced. Migration `20260919090000_phase7_concierge` was applied once. Additions include guest ownership hash, title, structured preferences, deletion marker, bounded turn count, response lease and safe message references. `AiUsageWindow` persists the hourly principal budget. Conversation/message indexes support owner lists and bounded history; database checks prohibit simultaneous customer and guest ownership and out-of-range turn counts. No catalogue reset or seed was run.

Authenticated identity always comes from the live Better Auth session. Anonymous ownership uses a random 256-bit HttpOnly SameSite cookie; only its SHA-256 hash is stored. Guest claiming requires both the matching guest cookie and the newly authenticated session, then clears guest ownership. Account changes remount and clear the client conversation view. An expired authenticated cookie is rejected instead of silently becoming a guest. Staff role does not grant access to other customer conversations, and CRM routes do not expose transcripts.

Delete removes message content and leaves a deleted conversation marker. Concurrent generation uses an atomic expiring lease; request abort and response-stream cancellation propagate to Gemini, and pre-commit abort checks prevent persisting an abandoned answer. The lease is released in finally. Rename, preference clearing and deletion reject active generation. Thirty conversation turns and thirty principal operations per hour are bounded. This is not a claim of public abuse/load hardening: rotating anonymous identities still requires additional deployment-level controls before public exposure.

## Endpoints

All responses are private/no-store; writes use the existing bounded JSON and same-origin checks.

| Endpoint under `/api/concierge/` | Purpose |
| --- | --- |
| `GET /` | Owner's latest 30 conversations and provider readiness |
| `POST /` | Create an owned conversation |
| `GET /:id/` | Owner-only bounded history and preferences |
| `PATCH /:id/` | Rename or explicitly clear remembered filters |
| `DELETE /:id/` | Owner-only transcript deletion |
| `POST /:id/claim/` | Cookie-bound guest-to-account claim |
| `POST /:id/messages/` | Validated request, bounded tool loop, streamed prose |
| `POST /:id/actions/` | Explicit user action against a persisted, owned suggestion |

## Tool and action boundaries

| Model tool | Verified scope |
| --- | --- |
| `search_residences` | At most six exact matching public units; city/locality, type, BHK, price, area, amenities, tower/floor, possession and availability constraints |
| `project_details` | Public project configurations, amenities and illustrative nearby places |
| `compare_units` | Two to four known public units with current facts |
| `page_context` | The validated project slug being viewed |
| `my_collection` | Only the current customer's shortlist, saved searches, visits or enquiries; bounded and explicitly selected fields |

Tools have strict schemas, no SQL/filesystem/network/admin capability, and no model-supplied customer identifier. Archived or deleted projects and unreleased inventory cannot appear as recommendations. All budget/BHK/area constraints apply to the same unit. Omitted remembered constraints are merged back server-side; clearing preferences is an explicit UI action. Changed non-null preferences are interpreted by the model and still require live-model evaluation. Unknown projects and no-match searches return no invented alternatives. Project amenities are never labelled as private unit amenities.

Cards and comparisons render server DTOs rather than model-written prices. Saved searches preserve the effective default `AVAILABLE` constraint and reuse identical customer filters under an advisory lock. Searches involving project/tower/floor constraints cannot be saved into the older, less expressive saved-search format; the UI retains them in conversation history instead of silently broadening them.

The model has **no write tool**. Shortlist/remove/save buttons call the owner-checked action endpoint with the persisted message identifier. It checks current public inventory and derives the selected project from stored references. Visit and enquiry actions return a validated handoff to the existing form; they create no request or lead. The existing explicit submission, server validation, customer ownership, idempotency and transactional CRM/history workflow remain authoritative. A visit confirmation means a recorded request, never a guaranteed appointment.

## Final verification

- Real broad 3 BHK search invoked `search_residences`; six available units matched a fresh Neon read exactly. A persisted follow-up retained city, BHK, availability and budget while adding minimum area.
- Live comparison succeeded over the actual HTTP route in 10.724 seconds after finalization refinement, with two current verified units and a persisted answer. The browser also rendered a successful two-unit comparison and table.
- Live unknown-property, unsupported private-pool/guaranteed-return, direct prompt-injection, forged tool-result, guest private-data and impossible-budget tests passed. These are concrete acceptance cases, not a guarantee against every possible hallucination or injection.
- Authenticated Gemini called `my_collection` for the correct customer's shortlist and saved searches. Returned references structurally matched fresh owner-scoped queries, with no staff fields. Guest claiming, former-guest/foreign-account denials, malformed actions, shortlist add/remove, duplicate handling and saved-search create/reopen passed using real persisted model suggestions.
- Visit/enquiry preparation created no request or lead. The live model required separate forms; the final browser handoffs opened the four-step visit review and explicit enquiry submission form. Previously completed explicit guest submissions and authenticated request-ownership tests remain valid and were not duplicated.
- Real HTTP abort stored no assistant completion, released the lease and allowed subsequent editing. Five offline protocol tests additionally cover preserved signatures, two-call finalization, truncated/unsafe/transport streams, cancellation, malformed tool bounds and classified quota errors with no retry.
- TypeScript, lint, production build, 31 local tests and six final HTTP regressions passed. After the database fix, four focused database tests passed on both Neon and the preserved local fallback; ten affected concierge integration tests passed. Unaffected live adversarial/protocol results were retained.
- The eight-width browser baseline is retained. Final live-comparison checks at 360, 768 and 1440px found no document overflow, a visible composer and internal table scrolling on mobile. The viewport override was reset.
- Final production-client scan: 32 files, zero matches for configured credentials, including both AI keys in ignored local environment files.
- Public inventory remains 8 projects / 96 units; one applied Phase 7 migration, zero active temporary QA staff memberships. Audit-created favourites/searches were removed; prior records and local fallback are preserved.

## Practical limits

The original isolated comparison failure's exact transport cause was not retained and could not be reproduced on its first diagnostic retry. The observed redundant-final-generation weakness was removed, error classification was added, and subsequent real HTTP/browser comparisons passed. This is not a promise that an external provider can never time out. Free-tier quotas and service availability remain external constraints, with no paid fallback.

The PostgreSQL query-queuing deprecation is resolved and absent from the reproduced browser/server workflow. The existing project-gallery image-priority warning remains nonfatal. Model context is intentionally bounded; a much older unit may need to be selected again, while structured search preferences persist. Project/tower/floor-specific searches cannot be represented in the older saved-search schema and stay in conversation history instead of broadening. The local fallback retains its empty catalogue and was verified without seeding. Physical devices, Safari/Firefox, screen-reader software, public load and anonymous-identity abuse hardening remain outside local test coverage. Google documents free-tier content use for product improvement; tests used fictional catalogue/QA data.

## Reproducible local checks

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
node --conditions=react-server --import tsx --test tests/database-sequencing.integration.ts
# To check the retained local cluster, start it with npm.cmd run db:local,
# set DB_TARGET=local in a separate shell, then run the same sequencing test.
# The test uses only existing catalogue reads and auto-dropped temporary tables.
# The integration commands use existing fictional QA identities and require local opt-in.
$env:ALLOW_DB_TESTS='true'
$env:AUTH_BASE_URL='http://localhost:3000'
$env:TEST_BASE_URL='http://localhost:3000'
node --conditions=react-server --import tsx --test tests/concierge.integration.ts
node --conditions=react-server --import tsx --test tests/concierge.final.integration.ts
node scripts/concierge-final-check.mjs
node --conditions=react-server --import tsx scripts/concierge-audit-state.ts
```

The live action and final-state scripts are one-off continuation audit utilities and use ignored fictional QA fixtures; do not rerun them blindly after cleanup.

Windows sandbox restrictions can prevent `tsx` from reading runtime user information. The authorized normal-runtime invocations passed; this was an environment startup failure, not a failed application assertion. The dev server must reload its generated Prisma client after schema generation. No repeat migration is required for continuation.
