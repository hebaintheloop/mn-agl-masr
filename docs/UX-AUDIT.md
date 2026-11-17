# Navigation, form and feedback audit

17 November 2026, Cairo time. Scope: guest, student and leader navigation, authentication forms, event RSVP, leader event/roster tools, responsive layout and copy. No production event, attendance, points or identity records were changed during the audit.

## Fixed

- Navbar previously used small muted IBM Plex text and undersized phone menu/theme targets. Added self-hosted Noto Sans Arabic for navigation, 15px semibold links, stronger contrast, 44px controls, and earlier tablet menu collapse. Body typography and the established design remain unchanged. Verified the actual rendered font using Chromium's platform-font inspection.
- Phone navigation hid the direct login button. Added login inside the menu, plus Escape/outside-click dismissal and `aria-controls`.
- Navbar no longer flashes guest signup actions while the account lookup is pending.
- The requested guide wording is now “كودك في الكلية”. The account-code field uses the same label, and neutral “٧ أرقام” replaces the owner's real code as a placeholder.
- Arabic and Persian numeral entry now normalizes to ASCII without losing leading zeros in student code, phone, ID and leader code fields. Fixed signup's invalid HTML phone pattern, which could bypass browser validation in modern browsers.
- A failed account refresh previously cleared the known profile, including after a successful RSVP. Only a confirmed 401 clears it now. Other failures retain the account, display a retry, and do not wrongly request login. Confirmed RSVP/cancellation updates locally only after server success.
- Existing participants see “حفظ التعديلات” rather than another first-time confirmation label.
- Duplicate submits are guarded synchronously. Auth modal close/Escape is blocked while submitting, and its initial focus goes to the first input.
- Event details include the finish time, an end date when needed and Cairo time.
- Direct event links have a loading/error/retry state; initial data failure no longer leaves the user on an unrelated homepage.
- Empty leaderboard copy describes the actual empty state without a competition slogan.
- Delayed revocation of the local recovery download URL avoids immediately invalidating it before a browser has consumed it.
- Added dedicated 16/32/48px favicons and a multi-size ICO from the complete user-supplied official badge, including its gold ring. Phone install icons remain separate.

## Validation

Production build and TypeScript; 32 unit tests. `tests/ux-audit.mjs` verifies the actual loaded navigation font, college-code wording, mobile login/menu keyboard behavior, Arabic/Persian numeric input including signup, form validity, duplicate-submit protection, pending-modal behavior, confirmed RSVP after a simulated profile outage, retries, event duration, and no horizontal overflow across guest/student/leader states at 360–1365px. API fixtures keep these failure tests from touching real records.

Leader, code-attendance and password-visibility regression checks are recorded in the release verification. No unrelated redesign, database migration, retention change or paid service was introduced.

## Remaining limits

This is a targeted audit, not a claim that every possible task is frictionless. Physical phone camera permissions, iOS download behavior and actual home-screen installation were not retested. Initial signup/recovery API error text remains intentionally broad; it can still be less helpful than field-specific server errors. A newly created QR must be downloaded at creation because only its hash is stored. An uploaded image abandoned before saving can remain unused in storage. Backups/restore and a 10,000-user load test were not certified by these UI checks.
