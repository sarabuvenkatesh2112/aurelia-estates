# Aurelia Way scroll interaction — 27 September 2026

## Cause and implementation

The excessive travel came from `signature-story.tsx`: a scrubbed master timeline spread across `max(2800, innerHeight * 3.6)` pixels, with inter-chapter dwell gaps and 0.65-second scrub catch-up. The mask, image, copy and numeral tweens remain unchanged. Timeline labels identify each reveal; GSAP Observer advances that paused timeline rather than mapping chapter progress to physical scroll distance.

- Intent threshold: 40 normalized vertical pixels. Direction reversal clears tentative accumulation.
- Gesture separation: 180ms without wheel events. A continuous stream is consumed once, including momentum after animation completion. Inputs during transitions are discarded, never queued.
- Touch: reset on a new contact; one step per contact.
- Transition: existing 1.25-second reveal at 1.6x, approximately 781ms. Duration comes from the reveal's timeline labels; completion releases the animation lock.
- Reduced motion: seek directly to the next chapter, retaining gesture gating.
- Pin: ScrollTrigger owns a two-pixel interval, replacing the long scrub region. Lenis is suspended only while the canvas owns input, including media-query controller replacement.
- Boundaries: entering consumes incoming momentum; a gesture beyond chapter 05 or before chapter 01 returns travel to the existing page scroller.
- Accessibility: ArrowUp/Down and PageUp/Down step chapters; inactive scenes are inert and hidden from assistive technology. Static reading fallback remains available without enhancement.
- Cleanup: navigation, external focus, escape keys and unmount release ownership. Observer, pin, active tween and document listeners are cleaned up. No additional timer or scroll engine.

## Files changed for this improvement

- `components/sections/signature-story.tsx`
- `hooks/use-story-steps.ts`
- `lib/motion/scroll-intent.ts`
- `lib/scroll.ts`
- `app/globals.css`
- `app/motion.css`
- `tests/story-scroll.test.ts`
- `docs/AURELIA-WAY-SCROLL-AUDIT.md`

CSS enables the existing canvas at responsive/reduced-motion breakpoints and gives mobile chapter controls clearance above the unchanged concierge launcher. No imagery, copy, font, overlay or reveal choreography was replaced. Earlier unrelated working changes were preserved.

## Verification

TypeScript, lint and all five focused gesture tests passed. The optimized production build completed successfully, including TypeScript and all 12 static pages. It was subsequently served locally for the final browser pass without rebuilding. No source changes followed the successful checks.

Full 01→02→03→04→05→exit and 05→04→03→02→01→exit sequences passed at 1440px in the production build. Each settled frame contained one visible chapter, with stable pin position. Rapid 12-event input and 45-event decaying wheel streams over roughly 2.8 seconds advanced only one chapter. Boundary exits resumed page scrolling. Route navigation removed the pin/Lenis hold; browser Back restored one functioning pin/controller. In-page Developments navigation escaped correctly.

Layout and step checks at 390×844, 768×1024, 1440×900 and 1920×1080 found no document horizontal overflow. All five story images loaded. Mobile chapter-five navigation was reachable above the launcher.

Reduced-motion behavior was exercised through the site's Reduce motion control: immediate chapter selection, keyboard reversal and bounded wheel bursts. This exercises the shared reduced-motion branch; the system preference remains respected by the existing media hook. Browser tooling does not expose OS media emulation or physical touch/trackpad hardware. OS-level preference emulation and physical-device swipe testing are not claimed. Touch contact gating is covered by the focused test; trackpad inertia is represented by browser wheel-event bursts and the 2.4-second unit-test stream.

No blocking browser, hydration or GSAP errors were captured. Development mode retains the existing nonblocking Next.js image-size advisories for hero/villa imagery. Nothing was published, deployed or pushed. Backend, database, authentication, CRM, AI, WhatsApp and architectural 3D code were not changed.

Final production sanity pass also repeated 1920px/tablet/mobile stepping, reduced-motion selection, mobile boundary release, and Account/Back cleanup. Returning produced exactly one story pin and one step to Craft. The production console returned zero warnings/errors. Screenshot: `.cache/aurelia-way-final-mobile.png`. Temporary viewport overrides were reset. No implementation changes or reruns of already-passed automated checks were necessary during this final pass.
