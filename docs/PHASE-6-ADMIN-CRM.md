# Phase 6 — Aurelia Private Office

The saved Phase 5 application is extended by a separate `/admin/` business workspace. Neon remains primary; the local PostgreSQL fallback is preserved. No existing customer, lead, request, project or unit is deleted or reset. Phase 6 was closed locally on 19 September 2026. The final audit records the executed checks, verified QA access revocation and practical limits.

## Authentication and server permissions

Existing Better Auth credentials, Argon2id hashes and database sessions are reused. Staff access additionally requires an active Agent record linked by unique `customerId` to the authenticated Customer. Registration cannot create that membership. Every admin API and data read resolves the session and checks current staff membership; mutations recheck membership/role inside their serializable transaction. Submitted roles, actor IDs and ownership are never trusted.

| Role | Operational read | CRM writes | Assignment | Inventory writes | Analytics | Staff roles/status | Audit log |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SUPER_ADMIN | All approved data | Yes | Yes | Yes | Yes | Yes | Yes |
| ADMIN | All approved data | Yes | Yes | Yes | Yes | No | Yes |
| SALES_MANAGER | Team CRM / inventory reference | Yes | Yes | No | Yes | No | No |
| SALES_AGENT | Assigned leads and their customers/requests; inventory reference | Assigned records | No | No | No | No | No |
| VIEWER | Approved summaries without contact details or internal notes | No | No | No | No | No | No |
| Customer / guest | None | None | None | None | None | None | None |

`lib/admin/policy.ts` centrally defines permissions and transition maps. `lib/admin/auth.ts` defines session checks and lead/customer scopes. Customer-only accounts receive a denied view and API 403; guests receive API 401 and a safe sign-in redirect. Next.js may stream that redirect in an HTTP 200 page response after its loading shell; no private workspace is rendered. Inaccessible individual records return 404. Unknown IDs and invalid query enums are rejected. There are no admin server actions bypassing the API authorization boundary.

Staff changes require SUPER_ADMIN. Self-role/status changes are rejected. Serializable writes and a last-active-super-admin guard protect privileged access. Open leads and pending tasks must be reassigned/closed before a staff member can be deactivated or changed to VIEWER. Pending follow-ups move with lead reassignment; unassignment cancels them explicitly and records that action.

## Additive database changes

`20260914090000_phase6_staff_crm` was applied once. The database now has three migrations and 42 Prisma models. Two models were added: FollowUp and EnquiryStatusHistory. Existing Agent, Customer, Lead, LeadNote, SiteVisit, Enquiry, Unit, status histories, UnitPriceHistory and AuditLogReady were extended or reused.

- Agent gains a unique optional customer link, staff role, version and last activity timestamp. Existing unlinked agents do not gain staff access.
- Lead gains controlled priority, an optimistic version and follow-up relationships. Existing `SITE_VISIT` is preserved; `VISIT_REQUESTED` and `VISIT_SCHEDULED` are additive enum values.
- SiteVisit gains a separate scheduled date/time and version. Original preferred date/time and submission message remain intact. History retains previous/new schedules and actor references.
- Enquiry gains a server enum status, version and status history. Original contact/message fields are not editable through CRM operations.
- Unit gains a version. Existing price/status history tables gain actor references. Hierarchy updates are not exposed through ordinary inventory editing.
- Lead notes record authors. Follow-ups record lead, derived customer, eligible assignee, due time, status, completion time and version. OVERDUE is derived from pending status and due time.
- AuditLogReady receives append-only records with safe IDs, statuses, amounts and field names. A database trigger rejects UPDATE/DELETE. Passwords, tokens, connection URLs and private note text are not copied into audit metadata.

No destructive migration or repeat seed was used. The original marketed collection remains 8 projects / 96 units. An additional QA unit and its histories are retained in an archived QA-only project/tower/floor/configuration hierarchy excluded from public discovery. Total counts legitimately include that fixture; regression assertions distinguish retained original/public data from additive QA records.

## Routes and workflows

The page and API boundaries use guarded catch-all routes with an explicit resource allowlist.

| Pages | Function |
| --- | --- |
| `/admin/sign-in/` | Separate staff sign-in presentation; no public staff registration |
| `/admin/` | Live dashboard, stage snapshot, upcoming visits, pending follow-ups, recent enquiries and inventory watch |
| `/admin/leads/`, `/admin/leads/:id/` | Paginated list or accessible pipeline, creation, assignment, controlled stage/priority/budget updates, notes and follow-ups |
| `/admin/customers/`, `/admin/customers/:id/` | Searchable customer directory and scoped contact/request/lead/shortlist context |
| `/admin/enquiries/`, `/admin/enquiries/:id/` | Review/contact/close workflow; validated linking to a matching lead; assignment/notes via that lead |
| `/admin/visits/`, `/admin/visits/:id/` | Confirm, reschedule, complete, cancel and no-show lifecycle with schedule history |
| `/admin/follow-ups/`, `/admin/follow-ups/:id/` | Due/overdue filtering and task completion/cancellation |
| `/admin/inventory/`, `/admin/inventory/:id/` | Project/tower/floor/configuration and price/status filters; controlled unit price/availability changes and history |
| `/admin/analytics/` | Authorized 7/30/90-day or bounded custom-range aggregates, source/project distribution and conversions |
| `/admin/staff/`, `/admin/staff/:id/` | Authorized account-to-staff grants, profiles, roles and active status |
| `/admin/audit/` | Authorized, paginated append-only business audit viewer |

`/api/admin/` and `/api/admin/:resource/:id?/` expose GET, POST and PATCH only. Mutations require exact same-origin JSON, bounded bodies and strict schemas. No hard-delete interface is exposed. Inventory mutations invalidate the existing catalog cache tag and public route caches after the transaction commits. Visit/enquiry changes invalidate the customer account view.

The design uses Aurelia's forest-green/fawn palette, serif editorial headings, restrained borders and clear data hierarchy. Large tables and pipeline columns scroll within named keyboard-focusable containers. Mobile navigation expands in document flow; there is no inaccessible drag-only operation. The pipeline reflects the current filtered, paginated set rather than implying it represents unbounded records.

## Validation and integrity

Phase 5 Unicode names, normalized email, Indian E.164 phones and IST visit rules are reused. New schemas are strict and reject mass assignment. Budgets/prices are bounded at INR 100 billion, non-negative and ordered when minimum/maximum are supplied. Notes are plain text, trimmed and limited to 2,000 characters. Pagination starts at one with at most 50 rows per page. Analytics ranges are ordered and bounded to 366 days; queries return aggregates and limited operational lists.

Lead and unit transitions follow explicit server maps. SOLD inventory is terminal in ordinary editing; a unit cannot jump directly from AVAILABLE to SOLD. REQUESTED visits can only be confirmed or cancelled. Confirmation/rescheduling requires a future supported IST slot. Completion/no-show requires a confirmed/rescheduled visit whose scheduled time has passed. Rescheduling appends its previous schedule rather than overwriting history. Customer DTOs show the effective schedule and safe lifecycle status while excluding private operational notes; the existing NO_SHOW-to-CANCELLED customer projection is preserved.

Every significant mutation uses a serializable transaction, an expected record version and atomic history/audit writes. Stale versions or serialization conflicts return 409 with a refresh instruction. Eligible staff assignments and project/unit/customer relationships are checked inside the transaction. Reconnecting an enquiry requires matching original customer, project and email.

## Local administration and tests

Keep `.env.neon`, `.env.auth` and the local `.env` private and unchanged. No hosted migration needs rerunning in the saved workspace. Use the existing local fallback explicitly only when wanted; apply pending additive migrations there before using the Phase 6 code against it.

`npm run staff:bootstrap` is an explicit database-owner recovery/bootstrap command, never an HTTP route. It requires an existing account email supplied locally as `STAFF_BOOTSTRAP_EMAIL` and explicit `ALLOW_STAFF_BOOTSTRAP=true`. It does not print credentials and appends an elevation audit record. Use it only for a specifically authorized recipient. After the first setup, normal staff management belongs in the SUPER_ADMIN interface.

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Opt-in integration commands require `ALLOW_DB_TESTS=true` and a running local server selected with `TEST_BASE_URL`. They create identifiable fictional records; they do not reset or delete existing data.

- `npm run test:db`: property/discovery/request database regressions.
- `npm run test:auth`: customer authentication and ownership regressions.
- `npm run test:admin`: full additive role/CRM/visit/inventory suite.
- `npm run test:admin:final`: focused continuation checks using the ignored fixture references from a prior admin suite.
- `node --conditions=react-server --import tsx --test tests/admin.cleanup.integration.ts`: final read-only assertions against the completed browser fixtures, combined visit filters, retained histories, public inventory and disabled temporary staff membership. It requires those existing fixtures and does not recreate them.

Ignored `.cache/phase6-qa.json` holds fictional QA login material for testing; never print, commit, upload or expose it through a public route. QA references/counts are recorded separately without credentials. Tests use past scheduled QA visits to verify completion/no-show without rewriting customer-requested dates on existing visits.

## Practical limits

No notifications, OTP, real AI, WhatsApp/Meta integration, maps, payments or deployment were added. Email verification/recovery remains outside the completed customer authentication scope. Operational pages use bounded lists and serializable conflict responses; they are not a realtime multi-user push interface. Internal notes are append-only through this UI. Media uploads, hierarchy creation/reparenting and bulk inventory imports are not exposed.

Last staff activity records successful operational writes where available. Customer profile/name/phone updates remain customer-owned; CRM links show safe profile information. Production abuse/load, physical-device, Safari/Firefox and screen-reader testing remain separate work. Existing nonfatal PostgreSQL query-queuing and environment-specific WebGL compiler warnings remain recorded in the audit.

## Final closure

The temporary SUPER_ADMIN membership for the existing fictional browser QA customer was disabled on 19 September 2026, with an append-only staff audit event. An existing authenticated browser session immediately received the denied admin view; its customer portal, shortlist and saved search remained available. No customer account or history was deleted. Other pre-existing integration fixtures remain retained and private.

The final browser audit confirmed audit filtering, actor/entity/timestamp rows, and combined visit text/date/status filters. A nonmatching search returned zero; the matching reference returned only the cancelled QA visit. Public inventory remains eight projects / 96 units. Internal inventory analytics intentionally include the additional archived QA unit; public listing results and facets exclude it.

The last narrow corrections contained hidden table labels within their scroll area, refreshed the follow-up assignee after lead assignment, supplied nested follow-up status/context and task timelines, combined visit search/date predicates, excluded archived inventory from public facets, and made local bootstrap advisory-lock results compatible with Prisma. A longer bounded public search transaction timeout addresses observed Neon latency. Staff history is available in the global audit view; staff detail does not render a separate per-record audit timeline.

See [Phase 6 final audit](../QUALITY-AUDIT.md#phase-6-final-audit) for the complete test record.
