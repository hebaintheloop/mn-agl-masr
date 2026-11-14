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
