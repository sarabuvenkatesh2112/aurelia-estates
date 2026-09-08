'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { storyScenes } from '@/data/editorial';
export function StoryVisual({
  image,
  children,
}: {
  image: string;
  children?: ReactNode;
}) {
  return (
    <div className="story-image">
      {children || (
        <Image
          src={image}
          alt="Architectural mood study of the Aurelia living philosophy"
          fill
          sizes="100vw"
        />
      )}
    </div>
  );
}
export function SignatureStory() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add(
      '(min-width: 1000px) and (prefers-reduced-motion: no-preference)',
      () => {
        const element = root.current;
        element?.classList.add('story-enhanced');
        const ctx = gsap.context(() => {
          const scenes = gsap.utils.toArray<HTMLElement>('.story-scene');
          gsap.set(scenes.slice(1), { autoAlpha: 0 });
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              pin: true,
              start: 'top top',
              end: '+=3800',
              scrub: 1,
            },
          });
          scenes.forEach((scene, i) => {
            if (i === 0) return;
            tl.to(scenes[i - 1], { autoAlpha: 0, duration: 0.15 }, i + 0.6)
              .fromTo(
                scene,
                { autoAlpha: 0, clipPath: 'inset(0 0 0 100%)' },
                {
                  autoAlpha: 1,
                  clipPath: 'inset(0 0 0 0%)',
                  duration: 0.75,
                  ease: 'power2.inOut',
                },
                i,
              )
              .fromTo(
                scene.querySelector('h3'),
                { y: 45 },
                { y: 0, duration: 0.8 },
                i,
              )
              .fromTo(
                scene.querySelector('.story-image'),
                { scale: 1.08 },
                { scale: 1, duration: 1 },
                i,
              );
          });
          tl.to({}, { duration: 0.8 });
        }, root);
        return () => {
          ctx.revert();
          element?.classList.remove('story-enhanced');
        };
      },
    );
    return () => mm.revert();
  }, []);
  return (
    <section
      ref={root}
      className="signature-story"
      aria-label="The Aurelia philosophy, five chapters"
    >
      {storyScenes.map((s, i) => (
        <article className="story-scene" key={s.label}>
          <StoryVisual image={s.image} />
          <div className="story-shade" />
          <div className="story-top">
            <p className="eyebrow">THE AURELIA WAY</p>
            <span>0{i + 1} / 05</span>
          </div>
          <div className="story-copy">
            <p className="eyebrow">{s.label}</p>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
          <div className="story-chapters" aria-hidden="true">
            {storyScenes.map((c, j) => (
              <span key={c.label} className={i === j ? 'active' : ''}>
                0{j + 1}
                <small>{c.label}</small>
              </span>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
