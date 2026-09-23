'use client';
import { useEffect, useRef, type RefObject } from 'react';
export function usePointerParallax(
  root: RefObject<HTMLElement | null>,
  invalidate: () => void,
) {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const media = matchMedia(
      '(min-width: 1000px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    );
    const reset = () => {
      pointer.current = { x: 0, y: 0 };
      invalidate();
    };
    const move = (e: PointerEvent) => {
      if (!media.matches || e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      pointer.current = {
        x: (e.clientX - r.left) / r.width - 0.5,
        y: (e.clientY - r.top) / r.height - 0.5,
      };
      invalidate();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', reset);
    media.addEventListener('change', reset);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', reset);
      media.removeEventListener('change', reset);
    };
  }, [root, invalidate]);
  return pointer;
}
