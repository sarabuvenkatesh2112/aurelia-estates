'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
export function MotionEngine() {
  const cursor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const lenis = new Lenis({
        duration: 1.05,
        smoothWheel: true,
        anchors: true,
        prevent: (n) =>
          n.closest(
            '[data-slot="dialog-content"], [data-slot="select-content"]',
          ) !== null,
      });
      lenis.on('scroll', () => ScrollTrigger.update());
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.utils.toArray<HTMLElement>('[data-image-reveal]').forEach((el) =>
        gsap.fromTo(
          el,
          { clipPath: 'inset(12% 0% 12% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1.4,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          },
        ),
      );
      return () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    });
    mm.add(
      '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
      () => {
        const el = cursor.current;
        if (!el) return;
        const x = gsap.quickTo(el, 'x', { duration: 0.25 }),
          y = gsap.quickTo(el, 'y', { duration: 0.25 });
        const move = (e: PointerEvent) => {
          const target = (e.target as HTMLElement).closest<HTMLElement>(
            '[data-cursor]',
          );
          x(e.clientX);
          y(e.clientY);
          el.textContent = target?.dataset.cursor || '';
          el.classList.toggle('visible', !!target);
        };
        const hide = () => el.classList.remove('visible');
        window.addEventListener('pointermove', move);
        window.addEventListener('scroll', hide, { passive: true });
        return () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('scroll', hide);
        };
      },
    );
    return () => mm.revert();
  }, []);
  return <div ref={cursor} className="context-cursor" aria-hidden="true" />;
}
