# Product Requirements Document (PRD)

**Therapy Practice Management System** (internal working name)

> Source spec this implementation is built from. Section numbers are referenced
> throughout the codebase (e.g. "PRD §15.3").

## 1. Executive Summary

A secure, AI-powered therapy practice management system for therapists to manage
patients, therapy sessions, clinical notes and scheduling.

Optimized for:

- Therapy session tracking (core entity)
- AI-assisted session summarization from voice recordings
- Manual session notes (text-based)
- Calendar and scheduling management
- Patient record management
- High-security handling of sensitive personal data

Designed for a single therapist initially, but architected for multi-therapist
SaaS expansion. **Patients never have access to the system.**

## 2. Product Goals

**Primary:** efficient session documentation; reduced admin overhead via AI
summaries; absolute accuracy in session-to-patient mapping; secure storage of
sensitive data; longitudinal view of patient progress.

**Secondary:** future SaaS expansion; multi-device responsive web app; AI-driven
insights over therapy history.

## 3. User Roles

- **3.1 Therapist (primary):** manages patients & sessions, records/writes notes,
  reviews AI summaries, uses calendar, generates interim summaries & insights.
- **3.2 Future (not active):** Clinic Admin, Staff/Assistant. RBAC must exist
  from the start even though only one role is active.

## 4. Core Design Principle — Session-Centric Architecture

The system is centered on the **Therapy Session** entity. Not the patient. Not
the note. Everything revolves around sessions.

## 5. Core Entities

- **5.1 Patient:** full name, phone (encrypted), email (encrypted), status
  (active/archived), created at.
- **5.2 Therapy Session:** patient ref, session date, time, session number (per
  patient), status (scheduled / completed / missing note / processing AI), notes,
  invoice status, tags, created/updated at.
- **5.3 Session Note:** linked to session; source (manual text / AI voice);
  content; timestamps.
- **5.4 Voice Recording (ephemeral):** uploaded audio; **must be deleted after
  processing**; never stored permanently.
- **5.5 Audit Log:** action type, timestamp, user, entity reference (non-sensitive
  id only). **No sensitive content stored.**

## 6. Patient Management

Create; edit (requires re-authentication); archive (preferred over deletion);
permanent deletion only from archive with extra password confirmation.

**Data security:** personal data encrypted at rest; access requires
re-authentication.

## 7. Therapy Session Management

- **A. Manual creation** — from calendar or patient profile.
- **B. AI-assisted (voice input)** — extract patient name & date, attempt to match
  existing patient & session, then show a confirmation UI.
- **RULE:** no automatic final assignment without explicit user confirmation.

## 8. AI Audio Processing Workflow

Input: voice recording only. Pipeline: speech-to-text (transient) → AI
summarization using **Gemini** → structured note. Output: final note stored;
**audio and transcript deleted immediately after processing.**

## 9. Manual Session Notes

Written directly; stored as-is; no AI processing; editable; used in later
summaries and insights.

## 10. AI Interim Summary (session-level)

Structured summary of a single session: key topics, emotional state, progress
indicators, observations.

## 11. AI Therapeutic Overview (longitudinal)

Aggregates multiple sessions: patterns over time, recurring themes, progress
trends, unresolved issues, recommendations for future sessions.

## 12. Calendar System

Day/week/month views; create/edit/delete session; drag & drop rescheduling.
Integration: bi-directional Google Calendar sync.

## 13. Invoice Integration

External integration only (pluggable provider system); no internal billing
engine. Invoice status per session: not issued / issued / viewed; linked to
session.

## 14. Search System

Searchable: patients, sessions, notes (metadata or restricted content).
Restrictions: no sensitive data in results; access requires auth (possibly
re-auth).

## 15. Security Requirements

- **15.1 Authentication:** email + password; password reset via email; optional
  2FA (future-ready).
- **15.2 Session lock:** auto logout after 10 minutes inactivity; full UI lock
  requires re-authentication.
- **15.3 Re-authentication (sensitive actions):** viewing patient personal data;
  editing patient data; deleting patient; exporting data.
- **15.4 Encryption:** AES-256 at rest; TLS for all network communication.
- **15.5 Data minimization:** only necessary data sent to AI (Gemini); avoid
  direct identifiers when possible.
- **15.6 Audit logging:** no sensitive content in logs; metadata only.

## 16. Data Retention Policy

Voice data: deleted immediately after processing. Transcripts: deleted
immediately after processing. Session notes: stored permanently.

## 17. Backup & Recovery

Daily automated backups; 30-day retention; restore capability per snapshot;
encrypted backups.

## 18. UI/UX Requirements

Fully responsive (mobile-first); Hebrew RTL (primary language); fast access to
"Add Session Note" from any screen; Floating Action Button for session creation
(primary CTA).

## 19. Edge Cases

- **Duplicate patients:** never auto-merge; require manual selection.
- **Missing session match:** prompt "Create new session" / "Select existing".
- **Ambiguous AI recognition:** always fall back to manual confirmation.

## 20. System Architecture Guidelines

- **Frontend:** React / Next.js; RTL required.
- **Backend:** stateless API design; session-based authentication.
- **Database:** relational (PostgreSQL recommended); encrypted sensitive fields.
- **AI layer:** Gemini API integration; isolated processing service recommended.

## 21. Future Scalability (must be supported in design)

Multi-therapist accounts; clinic-level management; role-based permissions;
patient portal (explicitly NOT enabled now); advanced AI analytics dashboard.

## 22. Critical Product Principle

In all ambiguous cases: **ask for confirmation; do not auto-assign; do not
auto-create entities silently.** The system must prioritize **correctness over
speed or automation.**
