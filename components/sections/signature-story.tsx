'use client';
import { useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { storyScenes } from '@/data/editorial';
import { useMotionScene } from '@/hooks/use-motion-scene';
import { motionTokens } from '@/lib/motion/config';
import { scrollToPosition } from '@/lib/scroll';
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
          loading={image === '/images/villa.webp' ? 'eager' : 'lazy'}
        />
      )}
    </div>
  );
}
export function SignatureStory() {
  const root = useRef<HTMLElement>(null),
    timeline = useRef<gsap.core.Timeline | null>(null),
    current = useRef(0);
  const [active, setActive] = useState(0);
  useMotionScene(root, ({ desktop, reduced }) => {
    const element = root.current;
    if (!element) return;
    const scenes = Array.from(
      element.querySelectorAll<HTMLElement>('.story-scene'),
    );
    const line = element.querySelector('.chapter-progress span');
    if (!desktop || reduced) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const index = scenes.indexOf(entry.target as HTMLElement);
              current.current = index;
              setActive(index);
            }
          }
        },
        { threshold: 0.55 },
      );
      scenes.forEach((scene) => observer.observe(scene));
      return () => observer.disconnect();
    }
    current.current = 0;
    setActive(0);
    element.classList.add('story-enhanced');
    scenes.forEach((scene, i) =>
      gsap.set(scene, { zIndex: i, autoAlpha: i ? 0 : 1 }),
    );
    const clips = [
      '',
      'inset(0% 0% 100% 0%)',
      'inset(18% 22% 18% 22%)',
      'inset(0% 0% 0% 100%)',
      'inset(40% 30% 40% 30%)',
    ];
    const tl = gsap.timeline({
      scrollTrigger: {
        id: 'living-story',
        trigger: element,
        start: 'top top',
        end: () => `+=${Math.max(2800, innerHeight * 3.6)}`,
        pin: true,
        scrub: 0.65,
        invalidateOnRefresh: true,
      },
      onUpdate: () => {
        const chapter = Math.min(
          4,
          Math.max(0, Math.floor((tl.time() - 0.5) / 1.4)),
        );
        if (chapter !== current.current) {
          current.current = chapter;
          setActive(chapter);
        }
        gsap.set(line, { scaleX: tl.progress() });
      },
    });
    timeline.current = tl;
    scenes.forEach((scene, i) => {
      if (!i) return;
      const start = i * 1.4;
      tl.set(scene, { autoAlpha: 1 }, start)
        .fromTo(
          scene,
          { clipPath: clips[i] },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1,
            ease: motionTokens.ease.travel,
          },
          start,
        )
        .fromTo(
          scene.querySelector('.story-image'),
          {
            scale: i === 4 ? 1.3 : 1.13,
            xPercent: i === 3 ? 12 : 0,
            yPercent: i === 1 ? 9 : 0,
          },
          {
            scale: 1,
            xPercent: 0,
            yPercent: 0,
            duration: 1.25,
            ease: motionTokens.ease.reveal,
          },
          start,
        )
        .fromTo(
          scene.querySelector('.story-copy'),
          { y: 30, opacity: 0, clipPath: 'inset(0 0 100% 0)' },
          {
            y: 0,
            opacity: 1,
            clipPath: 'inset(0 0 0% 0)',
            duration: 0.9,
            ease: motionTokens.ease.reveal,
          },
          start + 0.35,
        )
        .fromTo(
          scene.querySelector('.story-number'),
          { y: 50, opacity: 0 },
          { y: 0, opacity: 0.18, duration: 1 },
          start + 0.25,
        )
        .to(scenes[i - 1], { autoAlpha: 0, duration: 0.01 }, start + 1.01);
    });
    tl.to({}, { duration: 0.6 });
    return () => {
      timeline.current = null;
      element.classList.remove('story-enhanced');
    };
  });
  const go = (index: number) => {
    const tl = timeline.current,
      st = ScrollTrigger.getById('living-story');
    if (tl && st) {
      const time = index ? index * 1.4 + 1.08 : 0.3;
      scrollToPosition(st.start + (time / tl.duration()) * (st.end - st.start));
    } else {
      const scene = document.getElementById(`chapter-${index + 1}`);
      if (scene)
        scrollToPosition(
          window.scrollY + scene.getBoundingClientRect().top - 126,
        );
    }
  };
  return (
    <section
      id="living-story"
      ref={root}
      className="signature-story"
      aria-label="The Aurelia philosophy, five chapters"
    >
      <nav className="chapter-nav" aria-label="Living story chapters">
        <div className="chapter-nav-label">
          <span className="eyebrow">THE AURELIA WAY</span>
          <span>
            {String(active + 1).padStart(2, '0')} / 05 —{' '}
            {storyScenes[active].label}
          </span>
        </div>
        <div className="chapter-progress" aria-hidden="true">
          <span />
        </div>
        <div className="chapter-buttons">
          {storyScenes.map((scene, i) => (
            <button
              key={scene.label}
              onClick={() => go(i)}
              aria-label={`Chapter ${i + 1}: ${scene.label}`}
              aria-current={active === i ? 'step' : undefined}
              className={active === i ? 'active' : active > i ? 'visited' : ''}
            >
              <span>0{i + 1}</span>
              <small>{scene.label}</small>
            </button>
          ))}
        </div>
      </nav>
      {storyScenes.map((scene, i) => (
        <article
          id={`chapter-${i + 1}`}
          className="story-scene"
          key={scene.label}
        >
          <StoryVisual image={scene.image} />
          <div className={`story-shade story-shade-${i}`} />
          <div className="story-top">
            <p className="eyebrow">A CONSIDERED WAY OF LIVING</p>
            <span>CHAPTER 0{i + 1}</span>
          </div>
          <span className="story-number" aria-hidden="true">
            0{i + 1}
          </span>
          <div className="story-copy">
            <p className="eyebrow">{scene.label}</p>
            <h3>{scene.title}</h3>
            <p>{scene.text}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
