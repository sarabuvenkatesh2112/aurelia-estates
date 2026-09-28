import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';
let controller: Lenis | null = null;
const scrollHolds = new Set<symbol>();
let heldController: Lenis | null = null;
export const sectionJumpEvent = 'aurelia:section-jump';
let sectionJumping = false;
export const isSectionJumping = () => sectionJumping;
export function bindSmoothScroll(value: Lenis | null) {
  controller = value;
  // A media-query rebuild may replace Lenis while the chapter canvas is held.
  if (value && scrollHolds.size && !value.isStopped) {
    value.stop();
    heldController = value;
  }
}
/** Scope a pinned interaction to the existing controller, never a second scroller. */
export function suspendSmoothScroll() {
  const hold = Symbol('story');
  scrollHolds.add(hold);
  if (controller && !controller.isStopped) {
    controller.stop();
    heldController = controller;
  }
  return () => {
    scrollHolds.delete(hold);
    if (!scrollHolds.size) {
      if (controller === heldController) controller?.start();
      heldController = null;
    }
  };
}
export function preferredScrollBehavior(): ScrollBehavior {
  return document.documentElement.hasAttribute('data-reduced-motion') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'instant'
    : 'smooth';
}
export function scrollToPosition(top: number, immediate = false) {
  if (controller) {
    controller.scrollTo(top, { immediate, duration: 1.15, force: immediate });
  } else
    window.scrollTo({
      top,
      behavior: immediate ? 'instant' : preferredScrollBehavior(),
    });
}
export function navigateToSection(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const scene = ScrollTrigger.getById(id);
  const top = scene
    ? scene.start
    : window.scrollY +
      element.getBoundingClientRect().top -
      (id === 'home' ? 0 : 86);
  scrollToPosition(Math.max(0, top));
  window.history.replaceState(window.history.state, '', `#${id}`);
}

/** Navbar-only travel: one synchronized position change, never a scroll tween. */
export function jumpToSection(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  sectionJumping = true;
  try {
    window.dispatchEvent(new Event(sectionJumpEvent));
    const header = document.querySelector('.site-header');
    const offset = header
      ? parseFloat(
          getComputedStyle(header).getPropertyValue('--section-anchor-offset'),
        ) || 86
      : 86;
    const scene = ScrollTrigger.getById(id);
    const top = scene
      ? scene.start
      : window.scrollY +
        element.getBoundingClientRect().top -
        (id === 'home' ? 0 : offset);
    scrollToPosition(Math.max(0, top), true);
    ScrollTrigger.update();
    // Numeric scrub catches up over several frames during manual scrolling.
    // A direct arrival must instead render its actual progress before paint.
    ScrollTrigger.getAll().forEach((trigger) => {
      const scrub = trigger.getTween();
      // A trigger without numeric scrub can return 0 rather than undefined.
      if (scrub) scrub.progress(1);
    });
    window.history.replaceState(window.history.state, '', `#${id}`);
  } finally {
    sectionJumping = false;
  }
}
