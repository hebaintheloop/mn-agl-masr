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

## Student-code correction and redesign review

Student codes now require exactly seven digits without separators. Existing profiles were normalized without changing account IDs; legacy managed Auth aliases remain supported using the original password. The owner explicitly authorized leader access for their existing account, and the database role was verified. Five unit tests and the production build passed, including password-login compatibility tests. Browser checks passed for the deployed seven-digit field and the separate `/design-preview` welcome/feed proposal, English/Arabic switching, dark mode, mobile overflow, and keyboard dialog dismissal. No real account password was requested or used by the agent. Preview sample events were not inserted into the database.

Deployment: dpl_FKsB8ZRrqgRXJ3N9QbBuaQAm7YGX; frontend source 19c5254044ca4c1cf9698e9342c678a1b0fc9071; gateway version 7.

The first deployed preview check caught a server/browser timezone mismatch. Preview dates/times now explicitly use Africa/Cairo. Final deployed checks passed in both America/Los_Angeles and Africa/Cairo browser contexts with zero render errors, English switching, dark mode, phone layout, and the seven-digit signup field. Corrected deployment: dpl_FfjfiGfBhCKBm5DfZr9vm2qCFbov, source c8202323843a0653c32d6f03d616593f8b2e631a.

## Approved design applied across the app

The approved welcome design is now shared with the production homepage, with the squiggly arrow removed. Events, registration, accounts, leaderboard, attendance, leader tools and dialogs use the same Cairo University identity and neutral/red palette. Status and points labels have opaque solid fills and measured text contrast of at least 4.5:1 in both themes. Mobile create-event date fields stack vertically.

The production build, TypeScript and five existing unit tests passed. `node tests/design-rollout.mjs` passed student and leader UI states, events, requests, account, leaderboard, camera screen, language switching, dark mode, 390/375 px layouts, and solid-label contrast. These role states use browser-only intercepted API fixtures, no test accounts, role grants or database writes. A separate anonymous test confirmed the live homepage renders an empty state rather than sample events and that the account screen opens login.

The published rollout passed the same student/leader UI checks, using browser-only fixtures, including a cross-timezone assertion that event cards and details show the same Cairo time. A separate real anonymous browser check, without API interception, confirmed the public Vercel API returned Supabase events successfully, the approved homepage rendered without preview examples or the squiggly arrow, and the signup dialog opened. No accounts, roles or event data were changed for these design checks. Final deployment: dpl_3eaeMFMA7S3U91mPQABSaTt7Nqay, source 6694f0f0f7280ccaff247ecfc656b303d52aa202.

## Navigation, recovery feedback, favicon and data-flow audit, 17 November 2026

Production deployment `dpl_3Fq2oBXvYDXjzdrMBgUQUMVtkFsd`, application source `5e507e016653f7991ba13be526a460798b6cf5e8`, is READY at https://mn-agl-masr.vercel.app/. No backend deployment, migration, paid service, role change or business-record mutation was needed.

Build/TypeScript and 32 unit tests passed. Browser fixture suites passed: UX audit, leader workspace, code attendance, password visibility, images/access, public leaderboard, PWA and design rollout. The design rollout's date assertion now compares the same Cairo start time while allowing the newly displayed end time and timezone. The UX suite also passed against deployed assets, verifying the actual Noto font, mobile targets at 360–1365px, Arabic/Persian input, signup browser validity, repeated-submit protection and simulated failure/retry behavior.

Separate live read-only checks logged into the explicitly created student and leader test accounts, confirmed expected roles and permitted/forbidden event-stat responses, Secure/HttpOnly cookies, private/no-store account responses, absence of ID ciphertext/recovery hashes from the profile response, and public leaderboard fields limited to names and points. Both sessions were logged out. Deployed favicon ICO, 32px PNG and navigation font bytes exactly matched local files. An error/fatal runtime-log query returned no matching records in its reported recent window; this does not certify continuous monitoring.

Only Supabase schema and function definitions were queried for the database explanation. All ten public tables reported RLS enabled; live attendance/registration function definitions confirmed transactional awards, uniqueness and pending-code signup claims. No private student records were read for that documentation. See DATABASE-FLOWS.md for the full action map and UX-AUDIT.md for fixes and limits. Physical camera/device installation, independent backup restore and a 10,000-user load test were not performed in this release.
