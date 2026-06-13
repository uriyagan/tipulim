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

## 🔜 Phase 3 — Scheduling & calendar

- Full day/week/month grid with drag-and-drop rescheduling (§12).
- Bi-directional Google Calendar sync (`externalCalendarId` already modeled).

## 🔜 Phase 4 — Billing & search

- Pluggable external invoice provider; status webhooks → `invoiceStatus`
  (`invoiceExternalId` already modeled) (§13).
- Global search across patients/sessions/notes with sensitive-data restrictions
  (§14).

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
