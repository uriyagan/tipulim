# Roadmap

Build order, chosen to deliver the PRD's **core design principle** (a
session-centric system, §4) first, then layer automation on a correct foundation
(§22: correctness over automation).

## ✅ Phase 1 — Foundation & core session flow (done)

- Project scaffold: Next.js 15 App Router, TypeScript, Tailwind (RTL), Prisma.
- Data model for all core entities incl. AI/invoice/calendar scaffolding (§5).
- Auth: email+password, signed session cookie, idle auto-logout (§15.1–15.2).
- Re-authentication for sensitive actions (§15.3).
- AES-256-GCM field encryption at rest for patient PII (§15.4).
- Audit logging — metadata only (§5.5, §15.6).
- Patients: create / search / edit / archive / restore / delete-from-archive (§6).
- Sessions: create, sequential numbering, status & invoice status, tags,
  reschedule (§5.2, §7A).
- Manual session notes: add / edit / delete (§9).
- Calendar agenda view + FAB (§18).
- Hebrew RTL, mobile-first UI.

## ✅ Phase 2 — AI layer (Gemini) (done)

- AI provider abstraction (`src/lib/ai/`) with a Gemini REST implementation and
  a deterministic **offline stub** used when `GEMINI_API_KEY` is unset, so the
  whole workflow runs in dev/demo (§20 — isolated AI layer).
- Voice recording upload/record → transient speech-to-text → Gemini
  summarization → structured note; **audio + transcript held in memory only and
  dropped immediately, never persisted** (§8, §16, §5.4).
- `AiProcessingJob` lifecycle (`PENDING→TRANSCRIBING→SUMMARIZING→COMPLETED/
  FAILED`) surfaced in the UI via `PROCESSING_AI` status.
- AI interim session summary: key topics, emotional state, progress,
  observations, with (re)generate control (§10).
- AI-assisted session creation from voice with **mandatory confirmation UI** and
  patient suggestion/matching — never auto-assign or auto-create (§7B, §19, §22).
- Data minimization: prompts exclude identifiers/PII before sending to Gemini
  (§15.5).

Follow-ups: streaming/async job processing (currently synchronous within the
request), session matching by date in the voice wizard, and moving Gemini calls
to a dedicated worker service.

## ✅ Phase 3 — Scheduling & calendar (done)

- Full **month / week / day** calendar grid (RTL, Hebrew), with prev/today/next
  navigation and view switching (§12).
- **Drag-and-drop rescheduling** — drag a session to another day (month) or
  day+hour slot (week/day) → `rescheduleSessionAction` persists the new time.
- **Google Calendar sync** (§12): pluggable `CalendarProvider` with a Google
  REST implementation (OAuth + token refresh). Outbound — sessions are pushed on
  create/update/reschedule/delete. Inbound — "pull changes" reconciles external
  time changes back to local sessions. OAuth tokens encrypted at rest.
- Connect/disconnect + manual pull UI at `/settings/calendar`; disabled with a
  clear "not configured" state when `GOOGLE_CLIENT_ID/SECRET` are unset.

Follow-ups: webhook/push-channel for real-time inbound sync (currently manual/
on-demand pull), conflict resolution UI, and per-event two-way field mapping.

## ✅ Phase 4 — Billing & search (done)

- **Pluggable external invoice provider** (`src/lib/invoice/`): generic HTTP
  implementation + offline stub; **no internal billing engine** (§13).
- Issue invoice per session → stores `invoiceExternalId` + status; status
  **webhook** `POST /api/invoices/webhook` (shared-secret auth) maps the
  provider's reference back to the session and updates `issued`/`viewed`.
- **Global search** (§14) across patients / sessions / notes, scoped to the
  therapist, with **no sensitive data in results** (encrypted PII never
  returned; note matches return short snippets only). Search box in the nav and
  a dedicated `/search` page.

Follow-ups: invoice amounts/line-items, provider-specific adapters (e.g. Green
Invoice), webhook signature (HMAC) instead of a shared secret, and full-text /
ranked search indexing.

## 🔜 Phase 5 — Longitudinal AI & SaaS

- AI therapeutic overview across sessions: patterns, themes, trends,
  recommendations (§11).
- Multi-therapist tenancy, clinic admin, full RBAC (§21) — `Role` and
  per-therapist ownership already modeled.
- 2FA (§15.1), automated encrypted backups & restore (§17).

## Known follow-ups / hardening

- Password reset via email (§15.1).
- Rate limiting / lockout on failed logins.
- Server-side enforcement that the idle window and re-auth window also gate
  long-lived RSC navigations (currently cookie-expiry + client timer).
- Move Prisma config out of `package.json#prisma` before Prisma 7.
