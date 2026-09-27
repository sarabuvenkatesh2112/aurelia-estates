'use client';
import { useRef, type ReactNode } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { useExperience } from '@/components/layout/experience-provider';
import { MagneticButton } from '@/components/animation/magnetic-button';
import { useMotionScene } from '@/hooks/use-motion-scene';
import { motionTokens } from '@/lib/motion/config';
import { navigateToSection } from '@/lib/scroll';
export function HeroVisual({ children }: { children?: ReactNode }) {
  return (
    <div className="hero-media-frame">
      <div className="hero-visual">
        <div className="hero-atmosphere">
          <div className="hero-pointer-image">
            {children || (
              <Image
                src="/images/hero.webp"
                alt="Contemporary white residence with sculptural terraces and a tranquil swimming pool"
                fill
                priority
                sizes="100vw"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export function Hero() {
  const root = useRef<HTMLElement>(null),
    played = useRef(false);
  const { open, properties } = useExperience();
  useMotionScene(root, ({ reduced, desktop, fine }) => {
    const element = root.current;
    if (!element) return;
    const select = (s: string) => element.querySelector<HTMLElement>(s)!;
    const loader = select('.preloader');
    if (reduced) {
      gsap.set(loader, { display: 'none' });
      return;
    }
    const intro = gsap.timeline({
      defaults: { ease: motionTokens.ease.reveal },
    });
    const header = document.querySelector('.site-header'),
      logo = document.querySelector<HTMLElement>('.site-header .wordmark');
    if (!played.current && window.scrollY < 80 && !window.location.hash) {
      // A first frame may precede Strict Mode's cleanup/replay. Only a
      // completed timeline counts as played; interrupted contexts may restart.
      intro.eventCallback('onComplete', () => {
        played.current = true;
      });
      const word = select('.loader-word'),
        wordBox = word.getBoundingClientRect(),
        logoBox = logo?.getBoundingClientRect();
      intro
        .set(loader, { visibility: 'visible' })
        .fromTo(
          '.loader-word-letter',
          { yPercent: 110, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.75, stagger: 0.04 },
          0,
        )
        .fromTo(
          '.loader-line',
          { scaleX: 0 },
          { scaleX: 1, duration: 1.2, ease: motionTokens.ease.travel },
          0.15,
        )
        .to('.loader-caption', { opacity: 0, duration: 0.3 }, 0.8)
        .to(
          '.loader-pane-left',
          { xPercent: -100, duration: 1.3, ease: motionTokens.ease.travel },
          0.9,
        )
        .to(
          '.loader-pane-right',
          { xPercent: 100, duration: 1.3, ease: motionTokens.ease.travel },
          0.9,
        );
      if (logoBox)
        intro.to(
          word,
          {
            x:
              logoBox.left +
              logoBox.width / 2 -
              (wordBox.left + wordBox.width / 2),
            y:
              logoBox.top +
              logoBox.height / 2 -
              (wordBox.top + wordBox.height / 2),
            scale: logoBox.width / wordBox.width,
            duration: 1.25,
            ease: motionTokens.ease.travel,
          },
          0.95,
        );
      intro
        .fromTo(
          '.hero-visual',
          { clipPath: 'inset(18% 16% 18% 16%)', scale: 1.14 },
          { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.8 },
          0.65,
        )
        .to(word, { opacity: 0, duration: 0.25 }, 2.05)
        .to(loader, { autoAlpha: 0, duration: 0.15 }, 2.2);
      if (header)
        intro.fromTo(
          header,
          { opacity: 0 },
          { opacity: 1, duration: 0.45 },
          2.05,
        );
      intro
        .fromTo(
          '.headline-line>span',
          { yPercent: 112, rotationX: 8, filter: 'blur(5px)' },
          {
            yPercent: 0,
            rotationX: 0,
            filter: 'blur(0px)',
            duration: 1.35,
            stagger: motionTokens.stagger.lines,
          },
          1.45,
        )
        .fromTo(
          '.hero-support',
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.85, stagger: 0.06 },
          2.1,
        );
    } else {
      played.current = true;
      gsap.set(loader, { display: 'none' });
    }
    let ambient: gsap.core.Tween | undefined;
    if (desktop) {
      ambient = gsap.to(select('.hero-atmosphere'), {
        scale: 1.025,
        duration: 14,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
      gsap
        .timeline({
          scrollTrigger: {
            id: 'hero-transform',
            trigger: element,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.65,
            onToggle: (self) => {
              if (self.isActive) ambient?.resume();
              else ambient?.pause();
            },
          },
        })
        .to(
          select('.hero-media-frame'),
          { yPercent: 22, scale: 1.045, ease: 'none' },
          0,
        )
        .to(select('.hero-content'), { yPercent: -14, ease: 'none' }, 0)
        .to(
          select('h1'),
          {
            scale: 0.88,
            transformOrigin: 'left center',
            opacity: 0.22,
            ease: 'none',
          },
          0,
        )
        .to(select('.hero-bottom'), { opacity: 0, y: -25, ease: 'none' }, 0)
        .to(select('.hero-foot'), { opacity: 0, ease: 'none' }, 0);
    }
    const image = select('.hero-pointer-image'),
      type = select('.hero-depth');
    const ix = gsap.quickTo(image, 'x', { duration: 0.8 }),
      iy = gsap.quickTo(image, 'y', { duration: 0.8 }),
      tx = gsap.quickTo(type, 'x', { duration: 0.65 }),
      ty = gsap.quickTo(type, 'y', { duration: 0.65 });
    const move = (e: PointerEvent) => {
      if (!desktop || !fine || e.pointerType !== 'mouse') return;
      const x = e.clientX / innerWidth - 0.5,
        y = e.clientY / innerHeight - 0.5;
      ix(x * 12);
      iy(y * 8);
      tx(-x * 5);
      ty(-y * 3);
    };
    const reset = () => {
      ix(0);
      iy(0);
      tx(0);
      ty(0);
    };
    element.addEventListener('pointermove', move, { passive: true });
    element.addEventListener('pointerleave', reset);
    return () => {
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', reset);
    };
  });
  return (
    <section id="home" className="hero" ref={root}>
      <div className="preloader" aria-hidden="true">
        <div className="loader-pane loader-pane-left" />
        <div className="loader-pane loader-pane-right" />
        <div className="loader-word">
          {'AURELIA'.split('').map((letter, i) => (
            <span className="loader-word-letter" key={i}>
              {letter}
            </span>
          ))}
        </div>
        <div className="loader-caption">
          <span>EXCEPTIONAL BY DESIGN</span>
          <div className="loader-line" />
        </div>
      </div>
      <HeroVisual />
      <div className="hero-shade" />
      <div className="hero-content">
        <div className="hero-depth">
          <p className="eyebrow hero-support">
            <span className="tiny-line" /> A LIFE BEYOND THE ORDINARY
          </p>
          <h1>
            <span className="headline-line">
              <span>Some places</span>
            </span>
            <span className="headline-line">
              <span>
                change <em>everything.</em>
              </span>
            </span>
          </h1>
          <div className="hero-support hero-bottom">
            <p>
              Exceptional residences.
              <br />
              Extraordinary living.
            </p>
            <MagneticButton
              className="light"
              onClick={() => navigateToSection('residences')}
            >
              Explore residences
            </MagneticButton>
          </div>
        </div>
      </div>
      <div className="hero-foot hero-support">
        <a className="scroll-cue" href="#discovery">
          <ArrowDown size={15} /> SCROLL TO DISCOVER
        </a>
        <span className="hero-edition">THE AURELIA COLLECTION — VOL. 01</span>
        <button
          onClick={() =>
            properties[0] && open({ kind: 'property', property: properties[0] })
          }
          className="hero-property"
          data-cursor="Open"
        >
          {properties[0]?.name || 'Explore the collection'}{' '}
          <span>
            {properties[0]
              ? `${properties[0].neighbourhood}, ${properties[0].city}`
              : 'AURELIA ESTATES'}{' '}
            <ArrowUpRight size={16} />
          </span>
        </button>
      </div>
    </section>
  );
}
