'use client';
import Image from 'next/image';
import { useRef } from 'react';
import gsap from 'gsap';
import { useMotionScene } from '@/hooks/use-motion-scene';
import { clamp, damp, motionTokens } from '@/lib/motion/config';
const previews = ['/images/exterior.webp', '/images/pool.webp'];
export function CursorSystem() {
  const root = useRef<HTMLDivElement>(null);
  useMotionScene(root, ({ fine, reduced, desktop }) => {
    if (!fine || !desktop || reduced || !root.current) return;
    const element = root.current,
      cursor = element.querySelector<HTMLElement>('.cursor-orb')!,
      label = element.querySelector<HTMLElement>('.cursor-label')!,
      preview = element.querySelector<HTMLElement>('.cursor-preview')!;
    const images = Array.from(
      preview.querySelectorAll<HTMLElement>('.cursor-preview-image'),
    );
    let targetX = 0,
      targetY = 0,
      x = 0,
      y = 0,
      px = 0,
      py = 0,
      previousX = 0,
      inside = false,
      dirty = false,
      state = '',
      previewIndex = -1;
    const setX = gsap.quickSetter(cursor, 'x', 'px'),
      setY = gsap.quickSetter(cursor, 'y', 'px'),
      setPX = gsap.quickSetter(preview, 'x', 'px'),
      setPY = gsap.quickSetter(preview, 'y', 'px'),
      setRotation = gsap.quickSetter(preview, 'rotation', 'deg');
    const morphX = gsap.quickTo(cursor, 'scaleX', {
        duration: 0.22,
        ease: 'power3.out',
      }),
      morphY = gsap.quickTo(cursor, 'scaleY', {
        duration: 0.22,
        ease: 'power3.out',
      }),
      fade = gsap.quickTo(cursor, 'opacity', { duration: 0.16 }),
      previewFade = gsap.quickTo(preview, 'opacity', { duration: 0.25 }),
      previewScaleX = gsap.quickTo(preview, 'scaleX', {
        duration: 0.45,
        ease: 'power3.out',
      });
    const previewScaleY = gsap.quickTo(preview, 'scaleY', {
      duration: 0.45,
      ease: 'power3.out',
    });
    const change = (next: string, index = -1) => {
      if (next !== state) {
        state = next;
        element.dataset.cursorState = next || 'Hidden';
        label.textContent = ['Default', 'Control', ''].includes(next)
          ? ''
          : next;
        cursor.dataset.context = next;
        morphX(next === 'Default' ? 0.17 : next === 'Control' ? 0.3 : 1);
        morphY(next === 'Default' ? 0.17 : next === 'Control' ? 0.3 : 1);
        fade(next ? 1 : 0);
      }
      if (index !== previewIndex) {
        previewIndex = index;
        images.forEach((image, i) => {
          image.style.opacity = i === index ? '1' : '0';
        });
        previewFade(index >= 0 ? 1 : 0);
        previewScaleX(index >= 0 ? 1 : 0.88);
        previewScaleY(index >= 0 ? 1 : 0.88);
      }
    };
    const inspect = () => {
      dirty = false;
      if (
        !inside ||
        targetX < 0 ||
        targetY < 0 ||
        targetX > innerWidth ||
        targetY > innerHeight ||
        document.hidden
      ) {
        change('');
        return;
      }
      const hit = document.elementFromPoint(targetX, targetY);
      if (
        !hit ||
        hit.closest(
          'input,textarea,select,[role=combobox],[data-slot=select-content],[contenteditable=true]',
        ) ||
        window.getSelection()?.toString()
      ) {
        change('');
        return;
      }
      if (document.querySelector('[data-dragging=true]')) {
        change('Drag');
        return;
      }
      const context = hit.closest<HTMLElement>('[data-cursor]');
      const title = hit.closest<HTMLElement>('[data-preview]');
      const index = title ? Number(title.dataset.preview) : -1;
      change(
        context?.dataset.cursor ||
          (hit.closest('button,a') ? 'Control' : 'Default'),
        index,
      );
    };
    const tick = (_time: number, delta: number) => {
      if (dirty) inspect();
      if (!inside) return;
      const dt = Math.min(delta / 1000, 0.05);
      x = damp(x, targetX, motionTokens.pointer.cursorResponse, dt);
      y = damp(y, targetY, motionTokens.pointer.cursorResponse, dt);
      setX(x);
      setY(y);
      if (previewIndex >= 0) {
        px = damp(
          px,
          clamp(targetX + 28, 12, innerWidth - 256),
          motionTokens.pointer.previewResponse,
          dt,
        );
        py = damp(
          py,
          clamp(targetY - 92, 12, innerHeight - 184),
          motionTokens.pointer.previewResponse,
          dt,
        );
        setPX(px);
        setPY(py);
        setRotation(clamp((targetX - previousX) * 0.055, -3, 3));
      }
      previousX = targetX;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        inside = false;
        change('');
        return;
      }
      targetX = event.clientX;
      targetY = event.clientY;
      if (!inside) {
        x = targetX;
        y = targetY;
        px = targetX + 28;
        py = targetY - 92;
      }
      inside = true;
      dirty = true;
    };
    const leave = (event: PointerEvent) => {
      if (!event.relatedTarget) {
        inside = false;
        change('');
      }
    };
    const hide = () => {
      inside = false;
      change('');
    };
    const refresh = () => {
      dirty = true;
    };
    const observer = new MutationObserver((records) => {
      if (records.some((record) => !element.contains(record.target)))
        dirty = true;
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-dragging', 'data-open', 'data-closed'],
    });
    element.dataset.initialized = 'true';
    gsap.set([cursor, preview], { opacity: 0 });
    gsap.ticker.add(tick);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerout', leave);
    window.addEventListener('blur', hide);
    window.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);
    document.addEventListener('visibilitychange', hide);
    document.addEventListener('selectionchange', refresh);
    return () => {
      observer.disconnect();
      gsap.ticker.remove(tick);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerout', leave);
      window.removeEventListener('blur', hide);
      window.removeEventListener('scroll', refresh);
      window.removeEventListener('resize', refresh);
      document.removeEventListener('visibilitychange', hide);
      document.removeEventListener('selectionchange', refresh);
      delete element.dataset.initialized;
      delete element.dataset.cursorState;
    };
  });
  return (
    <div ref={root} className="cursor-system" aria-hidden="true">
      <div className="cursor-orb">
        <span className="cursor-label" />
      </div>
      <div className="cursor-preview">
        {previews.map((src, i) => (
          <div key={src} className="cursor-preview-image">
            <Image src={src} alt="" fill sizes="240px" />
            <span>0{i + 1} / SIGNATURE ADDRESS</span>
          </div>
        ))}
      </div>
    </div>
  );
}
