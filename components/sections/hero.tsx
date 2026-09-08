'use client';
import { properties } from '@/data/properties';
import { preferredScrollBehavior } from '@/lib/scroll';
import { useEffect, useRef, type ReactNode } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { useExperience } from '@/components/layout/experience-provider';
import { MagneticButton } from '@/components/animation/magnetic-button';
// A replaceable media slot: a future R3F canvas or Blender film lives here.
export function HeroVisual({ children }: { children?: ReactNode }) {
  return (
    <div className="hero-visual">
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
  );
}
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const { open } = useExperience();
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline();
        tl.fromTo(
          '.loader-line',
          { scaleX: 0 },
          { scaleX: 1, duration: 1.05, ease: 'power2.inOut' },
        )
          .to('.loader-word', { y: -20, opacity: 0, duration: 0.4 }, 0.9)
          .to(
            '.preloader',
            { yPercent: -100, duration: 1.1, ease: 'power4.inOut' },
            1.05,
          )
          .fromTo(
            '.hero-visual',
            { scale: 1.12 },
            { scale: 1, duration: 2, ease: 'power3.out' },
            1.1,
          )
          .fromTo(
            '.headline-line > span',
            { yPercent: 115 },
            { yPercent: 0, duration: 1.2, stagger: 0.13, ease: 'power4.out' },
            1.55,
          )
          .fromTo(
            '.hero-support',
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 0.9 },
            2.05,
          );
      }, root);
      return () => ctx.revert();
    });
    const move = (e: PointerEvent) => {
      if (
        e.pointerType !== 'mouse' ||
        matchMedia('(prefers-reduced-motion: reduce)').matches
      )
        return;
      gsap.to(root.current?.querySelector('.hero-depth') || [], {
        x: (e.clientX / window.innerWidth - 0.5) * 9,
        y: (e.clientY / window.innerHeight - 0.5) * 6,
        duration: 1.2,
        overwrite: true,
      });
    };
    root.current?.addEventListener('pointermove', move);
    const element = root.current;
    return () => {
      mm.revert();
      element?.removeEventListener('pointermove', move);
      const depth = element?.querySelector('.hero-depth');
      if (depth) gsap.killTweensOf(depth);
    };
  }, []);
  return (
    <section id="home" className="hero" ref={root}>
      <div className="preloader" aria-hidden="true">
        <div className="loader-word">
          AURELIA<span>EXCEPTIONAL BY DESIGN</span>
        </div>
        <div className="loader-line" />
      </div>
      <HeroVisual />
      <div className="hero-shade" />
      <div className="hero-content hero-depth">
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
            onClick={() =>
              document
                .getElementById('residences')
                ?.scrollIntoView({ behavior: preferredScrollBehavior() })
            }
          >
            Explore residences
          </MagneticButton>
        </div>
      </div>
      <div className="hero-foot hero-support">
        <a className="scroll-cue" href="#discovery">
          <ArrowDown size={15} /> SCROLL TO DISCOVER
        </a>
        <span className="hero-edition">THE AURELIA COLLECTION — VOL. 01</span>
        <button
          onClick={() => open({ kind: 'property', property: properties[0] })}
          className="hero-property"
        >
          The Banyan House{' '}
          <span>
            KOKAPET, HYDERABAD <ArrowUpRight size={16} />
          </span>
        </button>
      </div>
    </section>
  );
}
