# Event counts and student-code attendance, 15 November 2026

## Leader experience

The event list now fetches a single authenticated batch of RSVP/attendance counts, rather than opening each event or issuing one count request per event. Confirmed RSVP counts exclude cancelled registrations. Past and active events also show attendance. A small pending-account count is explicitly included in the attendance total, not added to it again. Unknown/unavailable counts never render as zero. Counts refresh when the workspace opens, every 30 seconds while visible, and through the refresh button.

Each event roster has a single-field form: student code only, seven digits without dashes. Arabic digits normalize to ASCII, and leading zeros remain intact. No name, phone, national ID or password is requested. Leaders can add a present student without an RSVP, whether or not an account exists. Existing accounts receive attendance and points immediately; unknown codes display saved points and a pending-account status. Repeating a code reports the existing attendance rather than awarding again. Walk-ins remain distinct from RSVPs, including in CSV exports. Leaders can correct attendance for past events; early entry opens one hour before the event. Student QR checks retain their original RSVP and attendance-window requirements.

## Data and safety

`student_code_attendance` is a private durable per-event/per-code ledger, retaining the points snapshot and recording actor/time. RLS is enabled; browser roles have no table access. SQL functions use SECURITY INVOKER, explicit empty search paths and service-role-only execution grants. Both the Edge gateway and the functions check the leader's database role. Actor IDs come from the authenticated session, never from submitted fields. Public event data and student leaderboards expose no pending codes or private counts.

Recording a code and finishing signup take the same transaction-level advisory lock per normalized code. The code ledger, known-account attendance and points are written in one transaction. Signup creates the profile, encrypted identity and any saved attendance/points in one transaction. Failed signup rolls back those writes while leaving previously saved code credits intact. The ledger uses an event/code primary key; attendance and points keep their existing event/user uniqueness. Automatic claims and retries use conflict-safe inserts, preserving the first points snapshot. No placeholder authentication accounts are created by leaders.

Statistics deduplicate the union of known-account attendance and code-ledger attendance by event/code. Claiming points cannot double the attendance count. The roster includes existing walk-ins and unclaimed codes, not just registration rows. RSVP records are never invented by adding attendance or by creating an account later.

## Verification

Build and TypeScript passed, plus 21 unit tests. The rolled-back database suite `tests/code-attendance.sql` runs the feature under the gateway's service-role privileges, covering pending credit, duplicates before/after signup, original points snapshots, signup failure and retry, existing-account walk-ins, separate RSVP counts, QR/manual deduplication, cancellations, future restrictions, and denied student/browser access. The fixture profiles and code-ledger rows were verified absent afterward.

`tests/code-attendance.mjs` checks event-card counts, the code-only form, Arabic digits, pending status, duplicate handling, an existing-account walk-in, failed count refresh, phone layouts and student visibility using browser-only fixtures. Leader and student regression suites also passed. Gateway tests verify that private counts, rosters and code attendance reject students and use the authenticated actor even if a forged actor is submitted. SQL tests validate transactional and sequential idempotency behavior; concurrent behavior is enforced by the shared database lock and unique constraints, rather than claimed as an external load test.

Security advisor output remains the intentional private-table RLS/no-policy informational notices and the pre-existing leaked-password-protection warning, https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
