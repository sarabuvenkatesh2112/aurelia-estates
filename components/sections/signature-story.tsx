'use client';
import { useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { storyScenes } from '@/data/editorial';
import { useMotionScene } from '@/hooks/use-motion-scene';
import { bindStorySteps } from '@/hooks/use-story-steps';
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
    steps = useRef<ReturnType<typeof bindStorySteps> | null>(null),
    current = useRef(0);
  const [active, setActive] = useState(0);
  useMotionScene(root, ({ reduced }) => {
    const element = root.current;
    if (!element) return;
    const scenes = Array.from(
      element.querySelectorAll<HTMLElement>('.story-scene'),
    );
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
    const tl = gsap.timeline({ paused: true });
    scenes.forEach((scene, i) => {
      if (!i) return;
      const start = i * 1.4;
      tl.addLabel(`chapter-${i}-start`, start);
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
      tl.addLabel(`chapter-${i}-end`, tl.duration());
    });
    tl.to({}, { duration: 0.6 });
    const controller = bindStorySteps(
      element,
      tl,
      reduced,
      current.current,
      (index) => {
        current.current = index;
        setActive(index);
      },
    );
    steps.current = controller;
    return () => {
      controller.destroy();
      steps.current = null;
      element.classList.remove('story-enhanced');
    };
  });
  const go = (index: number) => {
    if (steps.current) {
      steps.current.go(index);
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
