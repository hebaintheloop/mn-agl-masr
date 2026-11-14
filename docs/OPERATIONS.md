# Operations and release requirements

## Privacy and permissions

Browser users have no direct table grants. RLS is enabled on every application table, with no browser policies deliberately granting access. Only the trusted Edge Function uses the service role. It authenticates a server-only gateway secret and validates user sessions with Supabase Auth getUser before looking up database roles. Roles never come from user metadata. Students cannot read other profiles, national-ID ciphertext, recovery hashes or event requests. Leaderboard responses contain only full_name and points.

National IDs are AES-256-GCM encrypted on the Next.js server using random 96-bit IVs and stored separately. The key is held in Vercel environment configuration, outside the database. There is no decryption API. Password confirmation is required to replace an ID. Recovery codes are 192-bit secrets stored only as SHA-256 digests. National IDs are not used as password recovery factors.

Passwords require 12 characters. Cookie sessions are HttpOnly, SameSite=Lax and Secure in production. State-changing Next.js routes reject cross-origin requests. Rate limits are stored in PostgreSQL, not process memory. QR tokens are random opaque non-URL strings; the database stores their hashes. Attendance and point awards commit in one PostgreSQL transaction with unique event/user keys. Repeated requests are idempotent.

Printed QR codes can be photographed/shared; this design does not prove physical presence. Leaders can perform manual check-in when needed. Camera access requires HTTPS and user permission. Attendance is open from one hour before the start until one hour after the end.

## First leader

There are no automatically promoted accounts and no hard-coded admin passwords. The owner has now authorized leader access for their existing registered account, and that specific account was promoted. No future signup receives leader access automatically. Student access-denial tests passed; the owner can review the leader interface using their existing password.

## Media and free resources

Stock photos are explicitly labelled illustrative. Provide actual faculty photos, logo and a hosted MP4; configure HTTPS URLs using leader homepage settings. No paid storage or integrations were provisioned. Keep videos compressed and short, monitor transfer quotas, and use the poster fallback when video is unavailable.

## Backups and recovery — required before enrolling real students

Free hosting does not guarantee uninterrupted service or zero data loss. Atomic writes prevent partial attendance/points commits but do not replace backups.

1. Keep an offline encrypted copy of NATIONAL_ID_ENCRYPTION_KEY, APP_BACKEND_SECRET and RATE_LIMIT_SALT in the owner's password manager. Never store these in Git, a database dump, or a public document. Losing the ID encryption key makes existing IDs unreadable; replacing it silently is unsafe.
2. Use the Supabase dashboard's approved database connection credentials with `supabase db dump`/`pg_dump` to create encrypted backups outside the provider. Include auth data and app tables using the documented Supabase restore process; never expose raw national IDs. Test restoring into a separate local database before launch. No backup destination or database password was supplied, so scheduled off-provider backups are NOT configured.
3. Back up immediately before a major event and after attendance closes. Choose a retention period and restrict backup access to the owner.
4. If a request fails, the app does not show a success confirmation. Retry scanning after connectivity returns; duplicate requests cannot award points twice. Do not assume an offline scan was saved: offline attendance is intentionally unsupported.
5. Monitor Supabase database size, Auth MAUs, Edge invocations and egress; monitor Vercel usage. A 10,000-account target does not guarantee free service at every traffic level. There is no paid auto-upgrade configured by this build.

## Remaining provider advisories

Supabase leaked-password protection is disabled in the connected project's settings. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Review the provider's plan availability before enabling it; no paid setting was enabled. RLS-without-policy notices are intentional because the browser has no direct table access. A pre-existing publicly executable DDL helper trigger was restricted by a migration.

## Deployment

Production project: mn-agl-masr, Dublin compute, adjacent to the eu-west-1 database. Source uploads exclude environment secrets, local test credentials, node_modules and build output. GitHub integration currently rejects writes with `Resource not accessible by integration`; the local source and deployment are preserved independently. Connect repository Contents read/write access before enabling Git-based continuous deployment.

## Seven-digit student codes

Student codes now use seven digits with no separators. Existing profile codes were normalized without changing account IDs or linked records. Existing managed Auth email aliases are preserved, with a server-side password-login fallback so the original password continues to work. New accounts use the unseparated alias. Recovery and identity replacement continue to use the same underlying Auth user.

## Design review

`/design-preview` contains an isolated HISS-inspired welcome-page proposal and a Luma-style event feed. Illustrative photos/events are labelled; no sample events were inserted into the database. The public homepage remains available while the owner reviews the redesign.
