# Phase 8 — WhatsApp Business and CRM communications

## Reconstruction and scope — 26 September 2026

The continuation began on clean `main` at `abb702d`. `2b13eb0` preserved the Phase 1–8 checkpoint; `0495c40` added explicit scoped-result typing without weakening the cross-agent assertion. Antigravity's `abb702d` retained that assertion, corrected request-body typing and follow-up date handling, and reset the isolated outbound fixture consistently. All changes were preserved.

The exact-repeat receipt fix was already in the checkpoint: a duplicate test must reuse the original provider timestamp. The current seven-test integration suite passed, including the four-entry history assertion; no history implementation was replaced to satisfy it.

Current status: local implementation verified; **live Meta verification pending**. User-reported Meta callback verification and `messages` subscription are recorded as manual setup, not a locally observed real send/receive. The last reported Meta error was “Your phone number is still being set up.” No new live request was attempted because four required settings are absent locally.

## Architecture and permissions

- Six additive Prisma models: WhatsAppContact, WhatsAppConversation, WhatsAppMessage, WhatsAppStatusHistory, WhatsAppWebhookEvent and WhatsAppTemplate. The existing `20260922090000_phase8_whatsapp` migration is applied once. No migration, reset or seed was run in this continuation.
- `lib/communications/` separates configuration, contracts, official Graph transport, raw-body signatures, webhook ingestion, CRM commands and Gemini drafting. No unofficial WhatsApp automation is used.
- `/admin/communications/` and its UUID detail route provide paginated inbox/history, latest-message previews, unread counts, filters, assignment, verified CRM context, receipt history, consent and message review. Refresh preserves unsent text. Mobile notice/composer spacing was refined without changing earlier-phase UI.
- `/api/admin/communications/[[...parts]]` reuses database sessions and fresh active staff checks. SUPER_ADMIN, ADMIN and SALES_MANAGER can assign and sync templates; those roles plus SALES_AGENT can perform permitted CRM actions. SALES_AGENT sees only assigned conversations and permitted linked leads. VIEWER is read-only. Guests and ordinary customers are denied. Mutations require a matching scheme/Host/port Origin and bounded JSON; the Host-based check accommodates Next's internal development bind address without trusting forwarded origins.
- Exact canonical Indian phones link unique customers/leads. Ambiguous matches remain unlinked. Manual lead linking verifies phone and existing permissions, then derives project/unit and checks visit/enquiry relationships. Customer association requires one exact phone match consistent with the selected lead. Matching does not authenticate a WhatsApp user or grant access to their customer account.
- Casual inbound traffic never creates a lead, customer, enquiry or visit. Existing public forms remain the reviewed request handoff. Prepared visit acknowledgements distinguish requests from confirmations and check current CRM status. Private follow-ups reuse the existing FollowUp model and deduplicate identical pending tasks.

## Messaging, consent and reliability

Inbound messages are RECEIVED. The synchronous outbound path reserves SUBMITTING once, then records ACCEPTED, FAILED or UNCERTAIN. QUEUED remains a supported model state, not a background worker or delivery claim. SENT, DELIVERED and READ come from signed provider events. A late SENT/ACCEPTED cannot revive FAILED; delivered/read receipts can provide stronger evidence. Every event remains append-only even when it does not advance the displayed status.

Unique provider IDs, event hashes and idempotency keys plus transaction/advisory locks protect concurrent deliveries and submissions. Callback correlation handles a webhook arriving before the HTTP response. API acceptance is explicitly not delivery. There are no automatic outbound retries: uncertain outcomes, including a process interrupted after reservation, require staff investigation before a genuinely new attempt. Staff/thread send limits are serialized.

Free-form replies require a customer message within 24 hours. Outside that window the server requires explicit recorded opt-in and a recently synchronized, Meta-approved, supported UTILITY template. Positional body parameters and exact rendered text must match staff review. Only the first 100 templates and plain BODY/FOOTER layouts are supported; buttons/media/authentication/marketing campaigns are outside this phase. Provider approval can change between synchronization and sending, so Meta remains authoritative.

STOP/UNSUBSCRIBE records opt-out and pauses the thread. Opt-out blocks both staff sends and AI drafting. HUMAN disables assistance; PAUSED also disables sending; AI_ASSISTED only enables staff-requested drafts. Human requests or intervening messages invalidate an in-flight draft. A bounded, expiring lease is released only by its owner. Gemini receives public catalogue context and conversation text, never staff cookies or private CRM notes. All drafts require separate staff review and send confirmation; webhooks never automatically invoke Gemini or send a reply. Existing Gemini provider/security architecture remains unchanged.

Webhook GET uses constant-time token comparison. POST verifies HMAC SHA-256 against bounded raw bytes before parsing, checks business/number IDs and bounds event batches. Invalid signatures are rejected; transient database errors return 503 for provider retry. Unsupported media retain no binary/raw payload. Error responses omit credentials and raw provider details. Development request logging excludes verification URLs because Meta includes the verify token in the query string; any future proxy access logs need equivalent redaction.

## This continuation's verification

- Four unit tests: validation/Unicode/phone boundaries, signatures/challenge, five-role/window/intent/status policy, and same-origin/cross-origin handling.
- Seven retained integration tests: signed duplicate webhooks, five roles and IDOR, outbound idempotency/history, window/template/consent/STOP, reviewed AI and human takeover, CRM request safety, official adapter failure classification. Meta and draft runners are explicitly mocked.
- Two added integration tests: real CRM relationship linking and duplicate-safe follow-ups; latest/unread state, PAUSED drafting rejection, webhook-before-response and late failed-status ordering.
- HTTP verification: authorized communication mutation 200; foreign Origin 403. Browser mutation checked after correcting the internal-host mismatch.
- Actual Chromium inbox and detail checks at 360, 390, 430, 768, 1024, 1366, 1440 and 1920px: no document overflow. Mobile navigation, missing-provider disabled send, history, refresh and unsent-draft preservation inspected. No captured browser warning/error in the focused pass. Physical devices and other browsers were not tested.
- Existing Phase 1–7 suites were not rerun wholesale. Focused public route reads and final compiler/linter/build/client-public scan results are consolidated in QUALITY-AUDIT.md.

QA threads use synthetic business-number IDs, mock-labelled messages and private staff routes; eight retained mock threads were all PAUSED and the new QA follow-up CANCELLED. No pending Phase 8 QA follow-up remained. Business customer/lead/visit/enquiry counts were unchanged by the tests. Append-only evidence is retained, not deleted or passed off as live Meta activity. No staff elevation was added. Both pooled and direct Neon connection checks succeeded in this continuation; saved pooled runtime configuration and local PostgreSQL fallback remain unchanged.

## Live boundary and limitations

Still missing locally: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `META_APP_SECRET`. `WHATSAPP_VERIFY_TOKEN` is already present. All are server-only; .env.example contains placeholders. Never place them in NEXT_PUBLIC variables or documentation values.

After local configuration, restart the server only if needed. Confirm the test phone is provisioned, current token is valid, test recipient is authorized, and Meta's callback uses the current HTTPS tunnel plus `/api/whatsapp/webhook/`. The quick-tunnel hostname is temporary and is not hardcoded. Then verify a staff-reviewed real send, distinguish acceptance from signed delivery receipts, and receive a real recipient reply. No live send, receive, template approval or delivery success is claimed here.

Localhost project links are local previews until an intentional externally reachable SITE_URL is configured. Inbox refresh is manual, not a push subscription. History pages are bounded to 50 messages and activity to 20 events. Operational load, physical-device testing, broad media/template types and production monitoring remain outside local verification. Nothing was deployed, published or pushed.
