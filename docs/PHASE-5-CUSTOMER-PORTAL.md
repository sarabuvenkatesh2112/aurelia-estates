# Phase 5 customer portal

Implementation completed locally on 13 September 2026; final README/audit consolidation and hotspot browser verification closed on 14 September 2026. Neon remains primary. Existing Phase 1–4 assets, motion, property inventory, migrations and the local PostgreSQL fallback are preserved. No deployment or upload was performed.

## Authentication and security

Better Auth 1.7.4 uses its Prisma adapter with the existing Customer model. Passwords use Argon2id through `@node-rs/argon2` (19 MiB memory, two iterations, parallelism one). Password hashes and session tokens are never included in public account DTOs. Sessions live in PostgreSQL, expire after seven days, and are invalidated by sign-out. Cookies are HttpOnly and SameSite=Lax; Secure is enabled for an HTTPS `AUTH_BASE_URL`. HTTP is accepted only for local development origins.

The narrow auth route exposes registration, sign-in, sign-out and a sanitized session read. Other default authentication operations are not exposed. Mutations require same-origin JSON requests, bounded bodies and strict validation. Database rate limiting is enabled: sign-in 10/minute, sign-up 5/minute, general auth 60/minute. The current local preview deliberately uses a shared local rate-limit bucket. A future public deployment requires trusted-proxy/client identity configuration and abuse/load testing.

Every private repository operation resolves the server session before applying a customer ownership filter. Submitted customer IDs cannot select an owner. Foreign account records return 404; missing sessions return 401. Profile updates allow only name and phone. An invalid/expired session cookie on a contact submission returns 401 instead of silently creating a guest request. Guest enquiries and visits still work without an account, but previous guest records are not claimed merely by matching an unverified email address.

## Shared validation

`lib/validation/customer.ts` and `lib/validation/forms.ts` are shared by browser, API and persistence boundaries. Inputs receive inline feedback; submission revalidates everything on the server.

| Field | Implemented rules |
| --- | --- |
| Name | Trim, NFC normalization, collapse spaces; 2–60 characters; Unicode letters/marks, spaces, apostrophes, hyphens and periods; must contain a letter; reject digits, control/format characters, HTML and URLs |
| Email | Trim, lowercase, Zod email validation, maximum 254 characters; case-insensitive database uniqueness |
| Phone | Indian mobile number; optional +91, spaces and hyphens; ten national digits starting 6–9; reject all-repeating digits; store canonical +91 E.164 |
| Password | 8–128 characters, uppercase, lowercase, number and special character; exact confirmation; no trimming or silent rewriting |
| Registration | All identity fields plus exact confirmation and explicit terms/privacy acknowledgement |
| Notes | Optional, trimmed, maximum 500 characters; reject HTML, javascript schemes and unsafe control characters; render as escaped text |
| Visit date | Valid YYYY-MM-DD, today through one year ahead using Asia/Kolkata dates |
| Visit time | 09:00, 10:00, 11:00, 12:00, 14:00, 15:00, 16:00 or 17:00 IST; reject slots already passed |
| Visit choices | 1–10 guests; valid project/configuration; selected unit must be available and belong to that project/configuration |
| Saved search | Validated existing collection filter schema and ranges; name 2–60 characters without HTML/control characters |
| Redirects/updates | Internal return paths only; strict payload schemas reject additional ownership and profile fields |

## Database and migrations

The already-applied additive migration is `20260912090000_phase5_customer_portal`. It follows the original Phase 4 migration, bringing the total to two migrations and 40 Prisma models. No reset or repeat hosted seed was used in the final continuation.

Four models were added: AuthSession, AuthAccount, AuthVerification and AuthRateLimit. Customer gains authentication/profile metadata and case-insensitive email uniqueness. Enquiry and SiteVisit gain optional customer ownership, public references and ownership indexes. Existing Customer, FavoriteReady, SavedSearchReady, Lead and request-history entities are reused. Anonymous historical records retain nullable ownership. The eight projects and 96 units remain intact.

## Routes and customer experience

| Route | Purpose |
| --- | --- |
| `/sign-up/`, `/sign-in/` | Editorial registration/sign-in screens with return context, password visibility and field feedback |
| `/account/` | Server-protected profile, shortlist, saved searches, requested/upcoming visits, visit history and enquiries |
| `/privacy/`, `/terms/` | Fictional-platform disclosures and account-data/cookie explanation |
| `/api/auth/[...all]/` | Restricted Better Auth wrapper |
| `/api/customer/` | Private account overview |
| `/api/customer/profile/` | Read/update own name and phone |
| `/api/customer/favorites/`, `/api/customer/favorites/:id/` | List/add/read/remove own shortlist entries |
| `/api/customer/saved-searches/`, `/api/customer/saved-searches/:id/` | List/create/read/rename/remove own saved searches |
| `/api/customer/visits/:id/`, `/api/customer/enquiries/:id/` | Safe account-owned request details |
| `/api/projects/:id/visit-options/` | Public available unit/configuration choices for the visit form |
| Existing `/api/visits/`, `/api/enquiries/` | Guest or session-owned transactional request submission |

Favourites persist across reload and sign-in and appear on cards, project pages and the portal. Duplicate saves are idempotent. Saved searches restore the actual URL filters and current database results, and support rename/removal.

The visit dialog now moves through introduction, residence selection, date/time and review. Session details prefill the form; back/next retain entered data. Suggested date buttons plus a labelled ISO date field avoid reliance on a native date popup. Loading states and an idempotency key prevent duplicate requests. Success shows an AV reference and **request received**, never a confirmed appointment. Enquiries show an AE reference. Both provide a direct account link. Request creation, lead association, initial histories and conversions remain transactional.

The portal renders the latest 100 visits and enquiries; unit options are bounded at 200 available units per project. Email remains read-only because verification/change/recovery services are not implemented. Neither email nor phone is represented as verified.

## Local setup

The saved workspace already has its ignored `.env.neon` and `.env.auth`. Preserve them. Never copy hosted credentials over the local fallback `.env`, print them, or commit them.

For a fresh checkout only, create `.env.auth` once with a cryptographically random secret (this command refuses to overwrite an existing file and does not print its value):

```sh
node --input-type=module -e "import{writeFileSync}from'node:fs';import{randomBytes}from'node:crypto';writeFileSync('.env.auth','BETTER_AUTH_SECRET='+randomBytes(48).toString('base64url')+'\n',{flag:'wx',mode:384})"
npm ci
npm run db:generate
npm run dev
```

`BETTER_AUTH_SECRET` may instead be supplied securely through the process environment. `AUTH_BASE_URL` is read from the process environment, not `.env.auth`. Defaults permit localhost/127.0.0.1 ports 3000 and 3001. The final production audit used port 3002 because another local project occupied 3001:

```powershell
$env:AUTH_BASE_URL='http://localhost:3002'
node node_modules/next/dist/bin/next start -p 3002
```

Neon migrations are already applied; do not rerun or reset them to start the app. If using the preserved local cluster for new Phase 5 development, start it with `npm run db:local`, apply pending migrations with `DB_TARGET=local` and `npm run db:migrate`, then use `npm run dev:local`. The final continuation did not alter or migrate the fallback cluster.

## Verification and remaining limits

See the [Phase 5 final audit](../QUALITY-AUDIT.md#phase-5-final-audit) for executed test results, responsive matrix, final refinements and the distinction between retained integration results and final focused reruns.

Email verification, password recovery, email change, OTP, notifications, staff/admin authentication, CRM, real AI, maps, WhatsApp, payments and deployment remain outside this phase. Requests require later human/CRM confirmation. Physical mobile devices, Safari/Firefox, screen readers and public-load/abuse testing remain unverified. The existing nonfatal PostgreSQL query-queuing deprecation notice remains a server dependency limitation. Browser QA uses fictional example.test accounts; their persisted records are intentionally retained.
