# מערכת ניהול טיפולים · Therapy Practice Management System

A secure, session-centric practice management system for therapists: manage
patients, therapy sessions, clinical notes and scheduling — with high-security
handling of sensitive personal data.

> Built from the PRD in `docs/PRD.md`. The **core design principle** is that the
> system revolves around the **Therapy Session** entity — not the patient, and
> not the note.

## Status

All five build phases are complete. What works end-to-end today:

- 🔐 **Auth** — email + password login, signed httpOnly session cookie,
  inactivity auto-logout (10 min), and **re-authentication** for sensitive
  actions (viewing/editing/deleting patient personal data).
- 👤 **Patients** — create, search, edit (re-auth gated), archive/restore, and
  permanent deletion **only from archive** with re-auth confirmation.
- 🔒 **Encryption at rest** — patient phone & email are encrypted with
  **AES-256-GCM**; plaintext never touches the database.
- 🗒️ **Sessions** — session-centric model with sequential per-patient
  numbering, status & invoice status, tags, reschedule, manual notes.
- 🗓️ **Calendar** — full month/week/day grid with **drag-and-drop
  rescheduling** (§12); FAB for quick session creation.
- 🔄 **Google Calendar sync** — bi-directional (push on change + pull external
  changes); OAuth tokens encrypted at rest. Gracefully disabled until
  `GOOGLE_CLIENT_ID/SECRET` are configured.
- 🧾 **External invoicing** (§13) — pluggable provider (no internal billing);
  issue per session + status webhook (`issued`/`viewed`). Offline stub by default.
- 🔎 **Global search** (§14) across patients, sessions and notes, scoped to the
  therapist, with no sensitive data in results.
- 🧾 **Audit log** — every sensitive action is recorded as **metadata only**
  (no sensitive content, non-sensitive ids).
- 🎙️ **AI voice → note (Gemini)** — record/upload a session, get a transient
  transcript → structured note → interim summary; **audio & transcript are never
  persisted** (§8, §16). Falls back to a deterministic offline stub when no API
  key is set, so the flow is fully demoable.
- ✨ **AI interim summary** (§10) and **AI-assisted session creation** from voice
  with a **mandatory confirmation step** — nothing is auto-assigned (§7B, §22).
- 🧠 **Longitudinal AI overview** (§11) — aggregates a patient's sessions into
  patterns, themes, trends and recommendations.
- 🔑 **Two-factor auth** (TOTP, §15.1) and **RBAC** (§21) with per-role
  permissions, ready for multi-therapist clinics.
- 💾 **Encrypted backups & restore** (§17) — `npm run backup` / `npm run restore`.
- 🌐 **Hebrew RTL**, mobile-first responsive UI.

See `docs/ROADMAP.md` for the phase-by-phase build log and remaining hardening
follow-ups (password reset, login rate-limiting, recovery codes, off-site
backup storage).

## Tech stack

- **Next.js 15** (App Router, Server Actions) + **React 19** + **TypeScript**
- **PostgreSQL** via **Prisma**
- **Tailwind CSS** (RTL)
- Auth: `jose` (JWT) + `bcryptjs`; field encryption via Node `crypto`

## Getting started

### 1. Prerequisites

- Node.js 20+
- PostgreSQL 14+ (a `docker-compose.yml` is provided for local dev)

### 2. Configure environment

```bash
cp .env.example .env
# Generate real secrets:
openssl rand -base64 48   # → AUTH_SECRET
openssl rand -base64 32   # → ENCRYPTION_KEY (must decode to exactly 32 bytes)
```

Edit `.env` with your `DATABASE_URL` and the generated secrets.

### 3. Database

```bash
docker compose up -d db        # or use your own PostgreSQL
npm install
npm run prisma:migrate         # applies migrations
npm run db:seed                # demo therapist + sample data
```

The seed prints demo credentials (default `therapist@example.com` / `Passw0rd!`).

### 4. Run

```bash
npm run dev          # http://localhost:3000
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (runs `prisma generate`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:migrate` | Create/apply dev migrations |
| `npm run prisma:studio` | Browse the DB |
| `npm run db:seed` | Seed demo data |
| `npm run backup` | Encrypted `pg_dump` backup (+ prune by retention) |
| `npm run restore -- <file>` | Decrypt and restore a backup |

## Security model (PRD §15)

| Requirement | Implementation |
| --- | --- |
| Encryption at rest | `src/lib/crypto.ts` — AES-256-GCM on `Patient.phoneEnc` / `emailEnc` (+ OAuth/2FA secrets) |
| Auth | `src/lib/auth.ts` — signed JWT in httpOnly cookie |
| Two-factor auth (TOTP) | `src/lib/totp.ts` — RFC 6238; enroll at `/settings/security` |
| Idle auto-logout (10m) | `IdleLogout` client timer + sliding cookie expiry |
| Re-auth for sensitive actions | `requireElevated()` + `ReauthDialog`; short elevation window |
| RBAC | `src/lib/rbac.ts` — per-role permission matrix |
| Audit logging (metadata only) | `src/lib/audit.ts` — no sensitive content, ids only |
| Data minimization for AI | Prompts exclude PII; only clinical text sent to Gemini |
| Encrypted backups (§17) | `scripts/backup.ts` — AES-256-GCM, 30-day retention |

## Project layout

```
prisma/schema.prisma     # data model (session-centric)
src/lib/                  # db, auth, crypto, audit, validation, formatting
src/app/(app)/           # authenticated area (dashboard, patients, sessions, calendar)
src/app/login/           # auth entry
src/components/           # UI building blocks
src/middleware.ts         # route gating
docs/                     # PRD + roadmap
```
