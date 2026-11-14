# Mn Agl Masr · Faculty of Science

Arabic-first student activity app. Next.js 16 / React 19 / TypeScript on Vercel; Supabase Auth, PostgreSQL and a trusted Edge Function gateway. Self-hosted IBM Plex Sans Arabic / Inter, real Luma UI tokens with a native React adaptation, light and dark themes.

## Run locally

Use Node 24, `npm ci`, copy `.env.example` to `.env.local`, configure the project keys, then `npm run dev`. Run `npm test` and `npm run build` before deploying. Never commit real environment files or change the national-ID encryption key without a migration and key backup.

## Structure

- `app/`: homepage, layouts and same-origin API routes
- `components/`: responsive app, camera scanner and video/fallback
- `lib/`: server authentication, backend gateway and encryption
- `supabase/migrations/`: versioned PostgreSQL schema and restricted RPCs
- `supabase/functions/app-backend/`: authenticated database operations
- `public/assets/`: local fonts, tokens and illustrative photos
- `tests/`: encryption tests and opt-in live integration scripts
- `docs/`: operations, security and release evidence

## What works

Student-code/password signup and login; required encrypted national ID, full name and phone; one-time recovery code; automatic per-event excuse/accommodation acceptance; event registration and cancellation; in-app logged-in QR attendance; atomic attendance/points with duplicate protection; name-and-points-only leaderboard; leader event creation, manual check-in, participant search, CSV exports, news and homepage-media configuration. Leader routes require a database-assigned leader role. No student is automatically promoted.

## Setup still requiring account-owner input

The first real leader was assigned only after the owner authorized the specific existing account. Google OAuth is not configured in the connected Supabase project, so no nonworking Google button is shown. Replace the illustrative photos and wordmark with the original faculty media and logo; leader tools accept HTTPS video/poster/gallery URLs. The initial site deliberately has no invented news or events.

## Free plan limits

No paid services were enabled. The schema targets 10,000 registered members; the live check tested 50 simultaneous repeat scans, not 10,000 simultaneous users. Supabase Free and Vercel Hobby have quotas, availability limits and terms that must be monitored. These plans do not provide a zero-data-loss guarantee. See `docs/OPERATIONS.md` before a public launch.
