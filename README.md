# Mn Agl Masr

## Faculty of Science, Cairo University

**Live demo:** [mn-agl-masr.vercel.app](https://mn-agl-masr.vercel.app/)

Mn Agl Masr is an Arabic-first volunteer and event operations platform for students at the Faculty of Science. It turns attendance into a reliable workflow: students discover an event, RSVP with event-specific requests, check in from inside the logged-in app, and earn points that leaders can use to recognise consistent participation.

This repository documents both the product and the engineering decisions behind it. The goal is not just to display events, but to make the highest-risk moments dependable: concurrent check-ins, privacy-sensitive registration, leader operations, and clear recovery when something goes wrong.

## Product surface

### For students

- Arabic-first responsive UI with light and dark themes, plus PWA install support.
- Seven-digit student-code/password authentication, password visibility controls, and recovery codes.
- Required full name, phone, national ID, and academic year at signup. National IDs are never displayed after submission and cannot be edited from the profile.
- Event RSVP with medical accommodation and academic-excuse requests collected per event. Requests are automatically accepted and are not permanent profile records.
- Logged-in in-app QR scanning for attendance. Printed QR codes are not attendance links.
- Personal event history, attendance points, and a public leaderboard limited to names and points.

### For leaders

- Focused management dashboard for creating events, setting start/end times, RSVP response deadlines, points, dress code, and event images.
- Event-level RSVP and attendance counts, searchable rosters, accommodation and excuse views, and manual attendance by student code.
- Excel and PDF exports for event reports and the leaderboard.
- QR generation from the event workflow, with the raw attendance token kept out of the database.
- Role-gated operations backed by the database, not client-side UI state.

### Public experience

- Welcome page for Mn Agl Masr, Faculty of Science, Cairo University.
- Past events and the public leaderboard can be viewed without exposing student contact details or national IDs.
- Upcoming event details require an enrolled student or leader session. A direct event link guides a guest to enroll before RSVP.

## Product-engineering decisions

### Data integrity first

Attendance and points are written through transactional PostgreSQL functions with uniqueness constraints. A repeated scan cannot award points twice, and a leader’s manual attendance path uses the same durable rules as QR attendance. RSVP deadlines are checked server-side, not only in the browser.

### Privacy by construction

The browser never receives a service-role key or direct table grants. National IDs are encrypted before storage in a separate table, with no read or update API. Public leaderboard responses contain only `full_name` and `points`, and leaders are excluded from leaderboard results.

### A deliberate gateway boundary

Next.js same-origin routes validate request shape and session cookies. A Supabase Edge Function is the only application path with service-role access, and it re-checks the authenticated user and database role before privileged operations. This keeps the client fast while making authorization a backend invariant.

### Designed for the real bottleneck

The current target is roughly 10,000 registered students and small bursts of QR scans. The app uses indexed Postgres queries, short public caching, idempotent attendance writes, and a lightweight client flow. Free Vercel and Supabase tiers still have quotas, so capacity and backup claims must be validated with a production load test before a larger launch.

## Technology

- **Frontend:** Next.js 16, React 19, TypeScript, responsive CSS, PWA manifest/service worker.
- **Authentication:** Supabase Auth with student-code aliases and server-managed sessions.
- **Data:** Supabase Postgres, RLS enabled, constrained tables and transactional RPCs.
- **Backend boundary:** Supabase Edge Function using the service role, called only through the Next.js gateway.
- **Deployment:** Vercel Hobby and Supabase Free-compatible setup.
- **Exports:** ExcelJS for `.xlsx`, jsPDF with AutoTable for `.pdf`.
- **Typography:** self-hosted Arabic and Latin fonts to keep the interface readable and resilient.

## Architecture at a glance

```text
Browser / PWA
      │ same-origin requests + HttpOnly session
      ▼
Next.js routes ── validation, rate limits, encrypted ID handling
      │ server-only gateway secret
      ▼
Supabase Edge Function ── Auth getUser + role checks
      ▼
Postgres RPCs and tables ── atomic RSVP, attendance, points, reports
```

See [`docs/DATABASE-FLOWS.md`](docs/DATABASE-FLOWS.md) for the action-by-action data map and [`docs/OPERATIONS.md`](docs/OPERATIONS.md) for security, backups, and free-tier operating limits.

## Run locally

Requirements: Node 24 and a Supabase project.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Required environment variables are documented in [`.env.example`](.env.example). Keep `.env.local`, encryption keys, gateway secrets, recovery codes, and test state out of Git.

Before opening a pull request:

```bash
npm test
npm run build
```

## Repository map

```text
app/                         Next.js routes and app shell
components/                  Student, leader, scanner, event, and export UI
lib/                         Security, backend client, time, and report helpers
supabase/functions/          Trusted app-backend Edge Function
supabase/migrations/         Versioned schema, constraints, and RPCs
public/                      Fonts, logo, favicon, PWA assets
tests/                       Unit and browser-oriented regression checks
docs/                        Security, UX, operations, and data-flow notes
```

## Scope and honest limitations

This is a production-oriented foundation, not a claim of invulnerability or guaranteed zero data loss. Independent off-provider backups, device-level offline attendance, Google OAuth, and a formal 10,000-user load test still require explicit operational setup and verification. The repository keeps those boundaries visible so future product decisions are made with evidence rather than assumptions.
