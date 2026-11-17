# Leader workflow improvements, 15 November 2026

Leader entry point: `/?view=leader`, available from the main navigation, the persistent mobile management action, and My account. Client role checks control visibility; existing authenticated backend role checks continue to authorize every privileged action. No backend, database, national ID or contact-editing policy changes.

## Workflows

- Management workspace separates events, news and homepage media into keyboard-accessible tabs. Events have upcoming/past views, title/location search, public registration-link copying and a direct attendance action. No invented aggregate statistics or demo records appear.
- Each event has its own attendance component. Changing events unmounts the previous roster, preventing another event's attendees from carrying over. Participant data is fetched only when the roster opens. Loading, retry, refresh, empty and no-match states are explicit.
- Counts show registered, present, not checked in, and requests. Cancelled registrations have a separate filter and cannot be manually checked in. Search supports names, student codes and phones, including Arabic digits and common Arabic letter variants.
- Filters show everyone, not checked in, present, academic excuses/accommodations, or cancellations. Request details expand on demand and remain automatically accepted. Phone numbers are tap-to-call links. No national IDs are shown.
- Manual check-in keeps a row unchanged until the server confirms. In-flight rows cannot be submitted twice. Failed requests remain available to retry. An older roster refresh cannot overwrite a confirmed check-in. Existing server transactions and unique constraints remain responsible for durable, idempotent attendance and points.
- Downloads now use genuine Excel and PDF files for every selected view, including separate accommodation and academic-excuse tables. Search/filter results are preserved. See [request report details](LEADER-REQUEST-REPORTS.md).
- Personal registration is secondary for leaders and remains fully visible for students. Large event artwork is omitted from the leader's phone detail view to bring attendance controls closer to the top.
- News and media forms preserve unsaved input when switching tabs. Failed submissions preserve the draft, while successful saves are reported accurately even if the following page refresh fails. Media URL validation provides a useful error before submission.
- Closing and reopening event creation preserves its draft in application memory. Cairo-local scheduling is independent of the leader's device timezone and observes daylight saving. Invalid end times and skipped/repeated DST times are rejected before submission.
- After event creation succeeds, the creation form closes before QR image generation. QR image generation can retry independently, avoiding duplicate event creation. Existing printed in-app-only QR content is unchanged.

## Verification

Production build and TypeScript passed. All 19 unit tests passed, including winter/summer Cairo scheduling and invalid/DST dates. `tests/leader-ux.mjs` exercises management, event isolation, Arabic-digit search, filtered CSV export, cancellations, failed check-in retry, drafts, invalid end times, Cairo scheduling from a Los Angeles browser, QR creation and mobile widths 375/390/768/1024 plus dark/English. Existing student/leader regression checks also passed, including contact editing, per-event requests and solid-label contrast. Browser fixtures intercept all mutation requests; no test accounts or real event/contact/attendance changes are created by these tests.

Released to production as Vercel deployment `dpl_Ag6pkov7Y8MzXU4acfnd9muWEr9E`, source `3be3fd6`, READY. The complete leader UX browser suite also passed against the deployed application with browser-only fixtures, including rejection of the management screen for a student role. Real public API smoke check returned HTTP 200; real unauthenticated attendee requests returned HTTP 401. Immediate deployment-scoped error/fatal log scan had no matching records. These checks verify the release and do not promise future uptime. Local source ZIP was refreshed; no GitHub push was made because connected GitHub write access remains unavailable.

The code-attendance extension adds event-list counts and a code-only walk-in form. Leaders can record past-event attendance, with automatic saved-point linking at signup. See [CODE-ATTENDANCE.md](CODE-ATTENDANCE.md) for current count definitions and transactional behavior.
