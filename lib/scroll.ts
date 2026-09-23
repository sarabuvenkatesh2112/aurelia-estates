import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';
let controller: Lenis | null = null;
export function bindSmoothScroll(value: Lenis | null) {
  controller = value;
}
export function preferredScrollBehavior(): ScrollBehavior {
  return document.documentElement.hasAttribute('data-reduced-motion') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'instant'
    : 'smooth';
}
export function scrollToPosition(top: number, immediate = false) {
  if (controller) {
    controller.scrollTo(top, { immediate, duration: 1.15 });
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
