# News feature removal

News has been removed from the homepage, standalone preview, introductory copy, leader tabs and publishing editor. Related component state, data props, loading/error UI and CSS were removed. Leader keyboard navigation now wraps over the remaining Events and Homepage tabs using their actual count.

The public gateway action no longer reads the news table or returns a news property. The Next action allowlist no longer accepts news publishing, and the gateway's news insert handler was removed. Existing database records and the private table are preserved; no data was deleted and no schema/grants changed. Supabase gateway version 13 is active.

Build and TypeScript passed. Existing browser checks passed for student/leader layouts and flows, event management, request/attendance handling, photo upload, guest leaderboard, CTA hover/spacing and mobile/dark mode. The leader check covers ArrowLeft/ArrowRight/Home/End with the two remaining tabs. The gateway harness rejects any attempt to query news, confirms no news field is returned, and verifies leader news publishing is unsupported. A real local Next-to-Supabase check confirmed the public response excludes news and the removed publishing action returns 400, with upcoming events still private.

Historical design/verification documents describe earlier releases. This document and the current source supersede their news-related descriptions.
