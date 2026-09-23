'use client';
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useMotionScene } from '@/hooks/use-motion-scene';
import { bindSmoothScroll, navigateToSection } from '@/lib/scroll';
import { motionTokens } from '@/lib/motion/config';
import { revealImage, revealEditorial } from '@/lib/motion/choreography';
import { CursorSystem } from './cursor-system';
export function MotionEngine() {
  const root = useRef<HTMLDivElement>(null);
  useMotionScene(root, ({ reduced, desktop, fine }) => {
    let lenis: Lenis | undefined;
    let frame = 0;
    let disposed = false;
    const bar = root.current!.querySelector('.reading-progress span')!;
    const progress = gsap.quickSetter(bar, 'scaleX');
    ScrollTrigger.create({
      id: 'reading-progress',
      start: 0,
      end: 'max',
      onUpdate: (self) => progress(self.progress),
    });
    const tick = (time: number) => lenis?.raf(time * 1000);
    if (!reduced && desktop && fine) {
      lenis = new Lenis({
        duration: 1.08,
        smoothWheel: true,
        anchors: false,
        prevent: () => !!document.querySelector('[data-slot="dialog-content"]'),
      });
      lenis.on('scroll', () => ScrollTrigger.update());
      bindSmoothScroll(lenis);
      gsap.ticker.add(tick);
    }
    const navigate = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      const anchor = (event.target as Element).closest<HTMLAnchorElement>(
        'a[href^="#"]',
      );
      const id = anchor?.hash.slice(1);
      if (!id || !document.getElementById(id)) return;
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => navigateToSection(id));
    };
    document.addEventListener('click', navigate);
    if (!reduced) {
      document
        .querySelectorAll<HTMLElement>('[data-image-reveal]')
        .forEach((el, i) =>
          revealImage(
            el,
            el.dataset.imageReveal || ['curtain', 'aperture', 'rise'][i % 3],
          ),
        );
      const headings = [
        ['.introduction h2', 'tracking'],
        ['.developments h2', 'perspective'],
        ['.locations h2', 'mask'],
        ['.journal h2', 'mask'],
        ['.assistant-teaser h2', 'perspective'],
      ] as const;
      headings.forEach(([selector, style]) => {
        const el = document.querySelector<HTMLElement>(selector);
        if (el) revealEditorial(el, style);
      });
      const discovery = document.querySelector('#discovery');
      if (discovery) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: discovery,
              start: 'top 96%',
              once: true,
            },
          })
          .fromTo(
            discovery.querySelectorAll('.filter-field'),
            { clipPath: 'inset(0 0 100% 0)', opacity: 0.3 },
            {
              clipPath: 'inset(0 0 0% 0)',
              opacity: 1,
              duration: 0.8,
              stagger: motionTokens.stagger.controls,
              ease: motionTokens.ease.reveal,
            },
          )
          .fromTo(
            discovery.querySelector('.search-button'),
            { scale: 0.95, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.6 },
            0.3,
          );
      }
      if (desktop) {
        document
          .querySelectorAll<HTMLElement>('.development')
          .forEach((el, i) => {
            const image = el.querySelector('.development-image');
            const text = el.querySelector('.development-caption');
            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: el,
                start: 'top 90%',
                end: 'bottom 35%',
                scrub: 1,
              },
            });
            tl.fromTo(
              image,
              { y: 45, scale: 0.94 },
              { y: -25, scale: 1, ease: 'none' },
              0,
            ).fromTo(text, { y: 22 }, { y: -12, ease: 'none' }, 0);
            const numeral = el.querySelector('.development-image>span');
            if (numeral)
              tl.fromTo(numeral, { y: 25 }, { y: -15, ease: 'none' }, 0);
            if (i === 1)
              tl.fromTo(
                image,
                { clipPath: 'inset(12% 0 0 0)' },
                { clipPath: 'inset(0% 0 0 0)', ease: 'none' },
                0,
              );
          });
        const contact = document.querySelector('.contact');
        if (contact) {
          gsap.fromTo(
            contact.querySelector('img'),
            { yPercent: -5, scale: 1.08 },
            {
              yPercent: 5,
              scale: 1.03,
              ease: 'none',
              scrollTrigger: {
                trigger: contact,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1,
              },
            },
          );
        }
      }
    }
    void document.fonts.ready.then(() => {
      if (!disposed) ScrollTrigger.refresh();
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      document.removeEventListener('click', navigate);
      gsap.ticker.remove(tick);
      lenis?.destroy();
      bindSmoothScroll(null);
    };
  });
  return (
    <div ref={root}>
      <div className="reading-progress" aria-hidden="true">
        <span />
      </div>
      <CursorSystem />
    </div>
  );
}
