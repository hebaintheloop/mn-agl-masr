# News, images and member event access

The public homepage shows published news instead of upcoming event cards. Copy uses Egyptian Arabic. Existing HISS photo motion and Arabic-only navigation remain.

## Event access

“Enrolled” means a registered student account, with no new approval step. Public data excludes any event whose end time is still in the future. Both the events collection and individual event action require a validated session and profile. Leaders use the same authenticated collection.

A guest opening an upcoming event link sees signup/login without event metadata. Successful signup or login returns to the original event. RSVP remains an explicit action, including optional automatically accepted per-event requests. Logging out clears private event state. Request generations prevent stale public/member refreshes overwriting current data.

## Images

Event covers use private `event-images` storage. Canonical paths are persisted; authenticated responses batch-sign read URLs for one hour. Homepage images use public `site-images`. Only leaders can obtain signed upload URLs; filenames and owner folders are generated server-side, with overwrites disabled. Anonymous storage writes are blocked. Existing HTTPS image links remain optional.

Uploads accept JPEG, PNG and WebP, redraw to JPEG to remove metadata, resize to 1600 pixels and compress to at most 2 MiB. Buckets enforce JPEG and 2 MiB. Original browser file limit is 15 MiB. Gallery uploads support up to 12 images. No paid image transformations are used. Event images that are missing or fail to load use a solid red cover with title and the official logo.

## Verification

- Production-mode Next build and TypeScript passed.
- Unit coverage includes canonical path checks, scoped signed uploads, batch signing and missing-image fallback.
- Gateway harness checks guest/member/leader authorization with nonempty future-event fixtures.
- Browser fixtures exercise signup/login return-to-event, explicit RSVP, logout privacy, JPEG/PNG conversion, upload payloads, private cover persistence, gallery upload, news refresh, mobile and dark mode.
- Existing code-only attendance, dashboard counts and HISS motion regression checks passed.
- Real storage configuration was inspected and an anonymous write was denied by RLS. Browser transfer tests intercept storage requests; no real student credentials or production test accounts were used.

Signed event image URLs are temporary bearer links and remain usable until expiry. Previously public external cover links cannot become private through this application. Public past-event data remains available; the Events tab requires login.
