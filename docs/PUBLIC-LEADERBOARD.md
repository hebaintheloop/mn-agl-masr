# Public leaderboard and landing CTA

Guests can open `/?view=leaderboard` and use the **المتصدرون** navigation button without logging in. Loading, error/retry and empty states are explicit. Stale requests cannot update the screen after leaving it. The account view and upcoming event access remain gated.

The existing same-origin POST action accepts only `{ action: "leaderboard" }` for this public read, without initializing a user session. The gateway still checks its server-only application key, then calls the existing service-role-only `leaderboard()` RPC and explicitly projects each row to `full_name` and `points`. This retains the existing top-100 ranking. No student codes, IDs, contact information, medical requests, photos or private event details are returned. No database grants, RLS policies, SQL functions or schemas changed. Responses retain no-store behavior.

The final landing signup button has 48px space below its heading on desktop and 40px on phone. Hover and keyboard focus use brand red with white text and arrow. The creator credit was removed at the owner's request before deployment; no credit or email is rendered.

Verification: Next build/TypeScript, all 30 unit tests, gateway authorization/projection checks including a fixture RPC returning extra private fields, browser tests for guest navigation/deep links, loading/error/retry/empty states, private account access, mobile overflow, CTA hover colors/spacing and absence of a creator credit/email. A real local Next-to-Supabase check confirmed guest leaderboard success, exact name/points response keys, rejection of extra fields/foreign origin, and 401 responses for private actions. Browser fixtures save no production data.

Supabase gateway version 12 is active. Existing JWT verification mode remains unchanged because the gateway performs its own app-key/session validation.

Production verification, 17 November 2026, Cairo: source commit `d313be7` deployed READY as `dpl_9TQhVLVwq4Z1r8RhyiUrUweT8S4y` at https://mn-agl-masr.vercel.app/. The guest UI/CTA browser fixture suite passed against the deployed frontend. Actual production anonymous API and browser checks verified the public leaderboard with exact name/points-only response keys, no login prompt, input/origin validation, private endpoints still returning 401, mobile layout and absence of a creator credit. Initial error/fatal runtime logs returned no records. No production student data was modified during verification. Direct source deployment, local commit and ZIP updated; no GitHub push.
