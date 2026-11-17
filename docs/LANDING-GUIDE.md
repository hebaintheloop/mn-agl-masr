# Landing page usage guide

Added a four-step Egyptian Arabic usage guide after About and before the signup CTA, at /#how-to-use. It covers account creation and recovery-code storage, member-only event RSVP, automatically accepted per-event academic excuses/accommodations, and logged-in in-app attendance scanning and points. Academic excuses refer to an overlapping class or section, not an excuse for missing the activity.

The layout uses the existing fonts and light/dark palette, with an unboxed two-column ordered list on desktop and one column below 700px. No new dependencies, fetching, client state or backend changes.

Workspace startup failed on 17 November 2026. This change was applied to the saved source manifest matching production deployment dpl_9pXJCD61iTqoy168rLBHSm4acL3N (source commit 5b5fe2b) and deployed directly through Vercel. On workspace recovery, sync components/design-preview.tsx, components/design-preview.css and this document from the newest deployment before changing or redeploying the local checkout. No local commit or refreshed source ZIP could be created during the workspace outage.

Workspace recovered on 17 November 2026. The deployed guide source was synchronized into the local checkout before adding the accessibility and points sections. The guide now includes a direct target for the accommodation instructions at `/#how-to-use-requests`.

## Accessibility and points sections

The landing page now includes `/#accessibility`, titled **من أجل مصر متاحة للكل**, with examples of event accommodations, automatic acceptance, privacy from other students, and per-event submission. Its link jumps directly to the expanded accommodation/academic-excuse instructions inside the four-step guide.

`/#how-points-work` explains the published per-event point value, extra points on higher-need events, attendance rather than RSVP as the award trigger, one award per attendance, account/leaderboard tracking, and participation informing nominations. No fixed numeric schedule, automatic prize or guaranteed opportunity is promised. The copy follows the existing event points mechanism and the supplied Points System document, with subsequent user clarifications about academic excuses taking precedence.

Both new sections use the existing Arabic font and theme palette, with an unboxed two-column desktop layout and a single column below 700px. Build and TypeScript passed. Browser checks verified section copy, the accommodation anchor, leaderboard link, four-step guide preservation, responsive columns and absence of overflow at 375/390/768/1365px in light/dark, with no page errors. The existing HISS image/motion regression also passed. No backend or database changes were made.

Production: commit `1d410a1` deployed READY as `dpl_FimWZXhmVhMJLvmoGMSvBuY4Vfvf` on 17 November 2026, Cairo. The same browser checks passed against https://mn-agl-masr.vercel.app/ with real public data and no fixture mutations. The initial error/fatal runtime-log scan returned no records. The local checkout and source ZIP are synchronized again; deployment used direct source upload, not a GitHub push.

## Medical accommodation clarification

The owner clarified that accommodations mean medical/health/disability accommodations. The accessibility section, how-to step and optional RSVP accommodation label/placeholder now say this explicitly. Examples include avoiding prolonged standing, suitable seating and mobility support related to health needs. Students are asked to describe the support needed without being required to disclose a diagnosis. Automatic acceptance, event-specific submission and existing request privacy remain as implemented. No medical treatment or on-site clinical service is promised.

Build/TypeScript and the landing browser check passed at 375/390/768/1365px in both themes. A read-only intercepted student fixture verified the updated RSVP label, optional input, diagnosis guidance and mobile layout without saving any production medical information. No backend/schema changes.
