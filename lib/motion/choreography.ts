import gsap from 'gsap';
import { motionTokens } from './config';
export function revealImage(
  element: HTMLElement,
  style = 'curtain',
  delay = 0,
) {
  const clip =
    style === 'curtain'
      ? 'inset(0 100% 0 0)'
      : style === 'aperture'
        ? 'inset(16% 12% 16% 12%)'
        : 'inset(100% 0 0 0)';
  return gsap.fromTo(
    element,
    { clipPath: clip },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: motionTokens.duration.cinematic,
      delay,
      ease: motionTokens.ease.reveal,
      scrollTrigger: { trigger: element, start: 'top 90%', once: true },
    },
  );
}
export function revealEditorial(
  element: HTMLElement,
  style: 'tracking' | 'mask' | 'perspective' = 'mask',
) {
  const from =
    style === 'tracking'
      ? { opacity: 0.15, letterSpacing: '-.06em' }
      : style === 'perspective'
        ? {
            opacity: 0,
            rotationX: 12,
            transformPerspective: 900,
            transformOrigin: 'center bottom',
          }
        : { clipPath: 'inset(0 100% 0 0)' };
  return gsap.fromTo(element, from, {
    opacity: 1,
    rotationX: 0,
    letterSpacing: '-.03em',
    clipPath: 'inset(0 0% 0 0)',
    duration: motionTokens.duration.reveal,
    ease: motionTokens.ease.reveal,
    scrollTrigger: { trigger: element, start: 'top 88%', once: true },
  });
}
