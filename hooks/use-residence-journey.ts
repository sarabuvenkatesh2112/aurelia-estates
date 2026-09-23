'use client';
import { useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useMotionScene } from './use-motion-scene';
import { clamp } from '@/lib/motion/config';
import { preferredScrollBehavior, scrollToPosition } from '@/lib/scroll';
export function useResidenceJourney(
  section: RefObject<HTMLElement | null>,
  rail: RefObject<HTMLDivElement | null>,
  searched: boolean,
) {
  const [active, setActive] = useState(0);
  const current = useRef(0),
    trigger = useRef<ScrollTrigger | null>(null);
  useMotionScene(
    section,
    ({ desktop, reduced }) => {
      const track = rail.current;
      if (searched || !track) return;
      const cards = Array.from(
        track.querySelectorAll<HTMLElement>('.property-card'),
      );
      if (!cards.length) return;
      const progress = section.current?.querySelector('.journey-progress span');
      if (!desktop || reduced) {
        const onScroll = () => {
          const travel = Math.max(1, track.scrollWidth - track.clientWidth);
          const index = clamp(
            track.scrollLeft >= travel - 2
              ? cards.length - 1
              : Math.round(
                  track.scrollLeft /
                    Math.max(
                      1,
                      (cards[1]?.offsetLeft || 1) - cards[0].offsetLeft,
                    ),
                ),
            0,
            cards.length - 1,
          );
          current.current = index;
          setActive(index);
          if (progress)
            (progress as HTMLElement).style.transform =
              `scaleX(${(index + 1) / cards.length})`;
        };
        onScroll();
        track.addEventListener('scroll', onScroll, { passive: true });
        return () => track.removeEventListener('scroll', onScroll);
      }
      const distance = () => Math.max(0, track.scrollWidth - track.clientWidth);
      gsap.set(cards, { y: 0, '--residence-focus': 1 });
      gsap.set(
        cards.map((card) => card.querySelector('.property-photo')),
        { xPercent: 0, scale: 1 },
      );
      gsap.set(
        cards.map((card) => card.querySelector('.property-details')),
        { opacity: 1 },
      );
      const setters = cards.map((card) => ({
        focus: gsap.quickSetter(card, '--residence-focus'),
        depth: gsap.quickSetter(card, 'y', 'px'),
        image: gsap.quickSetter(
          card.querySelector('.property-photo'),
          'xPercent',
        ),
        scale: gsap.quickSetter(card.querySelector('.property-photo'), 'scale'),
        meta: gsap.quickSetter(
          card.querySelector('.property-details'),
          'opacity',
        ),
      }));
      const render = (value: number) => {
        const index = clamp(
          Math.round(value * (cards.length - 1)),
          0,
          cards.length - 1,
        );
        if (index !== current.current) {
          current.current = index;
          setActive(index);
        }
        setters.forEach((set, i) => {
          const relative = value * (cards.length - 1) - i,
            dominance = 1 - clamp(Math.abs(relative), 0, 1);
          set.focus(dominance);
          set.depth((1 - dominance) * 12);
          set.image(clamp(relative, -1, 1) * -3);
          set.scale(1.055 + (1 - dominance) * 0.025);
          set.meta(0.55 + dominance * 0.45);
        });
        if (progress) gsap.set(progress, { scaleX: value });
      };
      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        onUpdate: function () {
          render(this.progress());
        },
        scrollTrigger: {
          id: 'residences',
          trigger: section.current,
          start: 'top top+=76',
          end: () => `+=${Math.max(distance(), innerWidth * 1.6)}`,
          pin: true,
          scrub: 0.65,
          invalidateOnRefresh: true,
        },
      });
      trigger.current = tween.scrollTrigger || null;
      render(0);
      let drag: {
        x: number;
        y: number;
        scroll: number;
        moved: boolean;
      } | null = null;
      let cancelClick = false;
      const down = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        drag = {
          x: event.clientX,
          y: event.clientY,
          scroll: window.scrollY,
          moved: false,
        };
        cancelClick = false;
      };
      const move = (event: PointerEvent) => {
        if (!drag || !trigger.current) return;
        const dx = event.clientX - drag.x;
        if (!drag.moved && Math.abs(dx) < 8) return;
        if (!drag.moved && Math.abs(event.clientY - drag.y) > Math.abs(dx)) {
          drag = null;
          return;
        }
        drag.moved = true;
        cancelClick = true;
        track.dataset.dragging = 'true';
        const st = trigger.current;
        scrollToPosition(
          clamp(
            drag.scroll - dx * ((st.end - st.start) / Math.max(1, distance())),
            st.start,
            st.end,
          ),
          true,
        );
        event.preventDefault();
      };
      const up = () => {
        drag = null;
        delete track.dataset.dragging;
      };
      const click = (event: MouseEvent) => {
        if (cancelClick) {
          event.preventDefault();
          event.stopPropagation();
          cancelClick = false;
        }
      };
      const nativeDrag = (event: DragEvent) => event.preventDefault();
      track.addEventListener('pointerdown', down);
      track.addEventListener('click', click, true);
      track.addEventListener('dragstart', nativeDrag);
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      window.addEventListener('blur', up);
      return () => {
        up();
        track.removeEventListener('pointerdown', down);
        track.removeEventListener('click', click, true);
        track.removeEventListener('dragstart', nativeDrag);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        window.removeEventListener('blur', up);
        trigger.current = null;
      };
    },
    searched,
  );
  const go = (index: number, immediate = false) => {
    const track = rail.current;
    if (!track) return;
    const bounded = clamp(index, 0, track.children.length - 1);
    const st = trigger.current;
    if (st)
      scrollToPosition(
        st.start +
          (bounded / (track.children.length - 1)) * (st.end - st.start),
        immediate,
      );
    else {
      track.scrollTo({
        left:
          (track.children[bounded] as HTMLElement).offsetLeft -
          (track.children[0] as HTMLElement).offsetLeft,
        behavior: immediate ? 'instant' : preferredScrollBehavior(),
      });
    }
  };
  return {
    active,
    go,
    next: () => go(current.current + 1),
    previous: () => go(current.current - 1),
  };
}
