'use client';
import { useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useMotionScene } from './use-motion-scene';
import { sceneChapter, smoothUnit, type SceneClock } from '@/lib/scene-config';
import { scrollToPosition } from '@/lib/scroll';
export function useSceneProgress(root: RefObject<HTMLElement | null>) {
  const clock = useRef<SceneClock>({
    value: 0,
    invalidate: () => {},
    connect(callback) {
      this.invalidate = callback;
    },
  });
  const [chapter, setChapter] = useState(0);
  useMotionScene(root, ({ reduced, desktop }) => {
    const el = root.current;
    if (!el) return;
    let active = -1;
    const update = () => {
      const p = clock.current.value;
      gsap.set(el, { '--journey-progress': p });
      gsap.set(el, { '--entry-mask': `${smoothUnit(p / 0.09) * 100}%` });
      gsap.set(el, {
        '--exit-mask': `${(1 - smoothUnit((p - 0.87) / 0.13)) * 100}%`,
      });
      gsap.set(el, {
        '--exit-inset': `${smoothUnit((p - 0.91) / 0.09) * 5.5}%`,
      });
      el.setAttribute('data-progress', p.toFixed(3));
      const next = sceneChapter(p);
      if (next !== active) {
        active = next;
        setChapter(next);
      }
      clock.current.invalidate();
    };
    if (reduced) {
      clock.current.value = 0;
      update();
      return;
    }
    const tween = gsap.fromTo(
      clock.current,
      { value: 0 },
      {
        value: 1,
        ease: 'none',
        onUpdate: update,
        scrollTrigger: {
          id: 'architecture-journey',
          trigger: el,
          start: 'top top',
          end: desktop
            ? () => `+=${Math.max(2400, innerHeight * 3.3)}`
            : 'bottom bottom',
          pin: desktop ? el.querySelector('.architecture-viewport') : false,
          scrub: 0.7,
          invalidateOnRefresh: true,
        },
      },
    );
    update();
    return () => {
      tween.kill();
      el.removeAttribute('data-progress');
    };
  });
  function go(index: number) {
    const trigger = ScrollTrigger.getById('architecture-journey');
    if (!trigger) {
      setChapter(index);
      return;
    }
    if (trigger)
      scrollToPosition(
        trigger.start +
          [0, 0.18, 0.36, 0.57, 0.77, 1][index] * (trigger.end - trigger.start),
      );
  }
  return { clock, chapter, go };
}
