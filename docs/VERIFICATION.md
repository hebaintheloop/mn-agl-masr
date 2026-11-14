# Verification — 14 November 2026

Story: a student signs up → logs in → registers for an event with event-specific accepted requests → scans a printed opaque QR inside the logged-in webapp → sees a saved-attendance confirmation → receives exactly one points award.

- `npm test`: 2 encryption/recovery tests passed. AES-GCM ciphertext round-trips, repeated encryption uses distinct IVs, tampered ciphertext is rejected, and recovery secrets have 192 bits of entropy.
- `npm run build`: production compilation, TypeScript and static-page generation passed.
- Live Supabase signup/session persistence passed for two synthetic student accounts. Both accounts stayed students; no privileged test account was created.
- Per-event academic excuses and accommodations saved with status `accepted`.
- Browser camera test: Chromium fake-camera footage containing the real QR image was decoded by the actual in-app ZXing camera component; the API saved attendance and the UI confirmed it. This tests the camera flow using generated video, not a physical phone camera.
- 50 simultaneous repeat scan requests all succeeded in 2,487 ms for the test run. SQL verified exactly one attendance row, one points row, and 25 points. This is a duplicate/concurrency test for one event/user pair, not proof of 10,000 concurrent-user capacity.
- Invalid URL QR payloads, anonymous scans, cross-origin writes, and student attempts to access leader operations were rejected.
- Direct anonymous reads of profiles, identities, registrations and points_ledger were denied with Postgres code 42501.
- Student responses omitted national IDs, ciphertext and recovery hashes. Identity data was encrypted in storage.
- One-use password recovery passed; replaying the old recovery code failed.
- UI login, local light/dark mode, Arabic RTL and desktop/mobile overflow checks passed at 1440 and 390 px widths.
- Production browser → Vercel API → Supabase → browser verification passed at https://mn-agl-masr.vercel.app: login, actual camera decoder, persisted points, Secure/HttpOnly cookies, private no-store headers and phone layout.
- The managed test proxy's interception certificate required Playwright's test-only ignoreHTTPSErrors option. No certificate checks were disabled in application code.
- Supabase foreign-key performance advisories were addressed with indexes; fresh unused-index notices are expected. Browser RLS-without-policy notices are intentional because tables are accessible only through the server gateway. The pre-existing public DDL helper's execute grants were revoked. Provider leaked-password checking remains disabled and requires an account-owner/settings review.

## Limits and pending checks

Successful-path live leader tests remain pending: automatic approval review rejected elevating a test account in the live project. The role checks rejecting student access were tested. The owner must register and authorize a particular real account before leader access is assigned. Google OAuth, real faculty media and off-provider backups are not configured. No data-loss, invulnerability or 10,000-concurrent-user guarantee is claimed.

Temporary test event, attendance, points and both synthetic Auth accounts were removed after verification. No real students were enrolled for testing. Test credential state is excluded from Git and deployment; tests are excluded from Vercel source uploads.

Final frontend deployment: dpl_7BCRAuCifs83jsLewVDafkNTZjsy (Dublin), source 973456b547523d707c3594cee9bb92b4e75e0bba. Supabase gateway: version 6. Final deployed mobile signup UI and atomic profile/identity creation also passed using an all-zero synthetic ID and phone. The temporary recheck account was included in the previously authorized cleanup. Homepage and deployed font-license requests returned HTTP 200.
