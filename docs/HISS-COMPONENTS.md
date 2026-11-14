# HISS component study, 14 November 2026

Reference inspected: https://www.hiss.sydney/.
Read the public HTML, Webflow stylesheet, and the JavaScript referenced by the page (https://hiss-nine.vercel.app/app.js). Research copies stay outside the application. No HISS source, images, proprietary fonts or dependencies are bundled into this project.

The nonprofit preview was reverted at the user's request. The earlier red, white and black public page remains the basis.

## Recreated behavior

- Three unframed portrait image stacks, center larger, outer stacks at fixed -12/+12 degree angles. Images have small corner radii, no white mat, caption strip, shadow or doodle.
- Staggered entrance, 50px upward movement over one second, 100ms between stacks.
- Image cycling uses 750ms shrink/grow transitions, two-second holds, and staggered stacks. A complete three-image cycle lasts 10.5 seconds. The easing follows the observed secondary ease, approximated as cubic-bezier(0.16, 1, 0.35, 1).
- Headline and section reveals use complete text blocks so Arabic connections are preserved.

Independent React implementation in `components/hiss-motion.tsx` uses native Web Animations and IntersectionObserver. No GSAP, Lenis, Barba, jQuery or Webflow runtime is added. Native scrolling remains intact.

Motion pauses offscreen, in hidden tabs and through the existing pause button. Reduced-motion preference shows a static first image and disables reveals, including changes to the preference while the page is open. Optional configured video retains a poster/image fallback. Gallery data comes from the existing CMS fields, up to nine images, with inherited illustrative photos as explicit fallbacks. No backend data changes.

## Verification and release

Production deployment `dpl_Jn9A42xgbDXdc49RwY2Ec6mzGp4c`, source commit `5a0f58d`, READY on 14 November 2026. Live site: https://mn-agl-masr.vercel.app/.

Build and TypeScript passed. `tests/hiss-motion.mjs` passed locally and on production: unframed loaded images, pause/resume without resetting the frame, offscreen pause, reduced-motion changes, mobile widths 375/390, dark mode, English and no browser errors. Existing student/leader interface regression checks passed with browser-only fixtures and no database writes. The real public API returned HTTP 200 with events, news and home configuration. Deployment-scoped error/fatal log scan returned no matching records immediately after release. This is a release smoke check, not a guarantee of future uptime.

GitHub write access remains unavailable; the reviewed local source was deployed directly through the connected Vercel integration. The source ZIP is refreshed separately.
