# Account editing and copy cleanup

Students and leaders can edit only their phone number and optional contact email from the account details form. Names, student codes and national IDs remain immutable in the app. Signup still requires a national ID; signup help text now states that it cannot be displayed or changed afterward.

Contact email is stored in the private `profiles.email` column. It is not a login identifier, a verified address, or a password-recovery mechanism. Student-code login aliases and recovery codes remain unchanged. The account form does not display the internal authentication alias.

Both Next.js and the authenticated Edge gateway validate an allowlist containing only phone and email. Attempts to submit IDs, names, roles, another user's ID or other extra fields are rejected. The gateway derives the owner from the authenticated session and scopes its update to that owner's profile. National ID replacement is removed from Next.js actions and explicitly rejected by the Edge function. Browser roles have no direct UPDATE grant on profiles or identities; their RLS remains enabled. Existing encrypted IDs are preserved.

Removed the landing photo note, greeting eyebrow, section eyebrows, repeated affiliation subtitle, spare slogan beside the event CTA, footer slogan, and leaderboard eyebrow/subtitle. Faculty and university attribution remain in the brand header/footer. No image-motion changes.

Verification: production build and TypeScript, 15 unit tests, gateway integration tests using a mocked database, and student/leader browser regression tests covering contact form submission and reload persistence using browser fixtures. A real database contact update was verified inside a rolled-back transaction, with no lasting contact changes. Security advisors retain intentional no-policy informational notices for the private gateway architecture and the previously documented free-plan leaked-password-protection warning: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

Released as Vercel deployment `dpl_fSLnLnhbjxKnDgp3A5WyMhMrSkFJ` from source `6cc2958`, with Supabase gateway version 8. Production smoke checks confirmed HTTP 400 for the removed ID action and contact requests containing forbidden fields, HTTP 401 for unauthenticated contact updates, and HTTP 200 for the public API. The immediate deployment-scoped error/fatal log scan found no matching records. No test accounts were created and no real contact changes were retained.
