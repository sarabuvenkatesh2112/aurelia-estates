/** Shared motion vocabulary. Seconds for timelines; pixels for pointer limits. */
export const motionTokens = {
  ease: { reveal: 'power4.out', travel: 'power3.inOut', settle: 'expo.out' },
  duration: { feedback: 0.24, panel: 0.62, reveal: 1.15, cinematic: 1.65 },
  stagger: { controls: 0.065, lines: 0.13, editorial: 0.16 },
  spring: { type: 'spring' as const, stiffness: 230, damping: 29, mass: 0.65 },
  curve: [0.22, 1, 0.36, 1] as [number, number, number, number],
  pointer: { cursorResponse: 28, previewResponse: 11, magnet: 7, text: 3 },
};
export const motionQueries = {
  all: 'all',
  desktop: '(min-width: 1000px) and (min-height: 650px)',
  fine: '(hover: hover) and (pointer: fine)',
  reduced: '(prefers-reduced-motion: reduce)',
};
export interface SceneConditions {
  desktop: boolean;
  fine: boolean;
  reduced: boolean;
}
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
export const damp = (
  current: number,
  target: number,
  response: number,
  delta: number,
) => current + (target - current) * (1 - Math.exp(-response * delta));
export const propertyImageId = (id: string) => `property-image-${id}`;
