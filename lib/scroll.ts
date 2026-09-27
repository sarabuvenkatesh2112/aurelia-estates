import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';
let controller: Lenis | null = null;
const scrollHolds = new Set<symbol>();
let heldController: Lenis | null = null;
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
  window.history.replaceState(null, '', `#${id}`);
}
