'use client';
import { useMotionPreference } from '@/components/animation/motion-preference';
import { useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { clamp, motionTokens } from '@/lib/motion/config';
export function MagneticButton({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  const bounds = useRef<DOMRect | null>(null);
  const { reduced } = useMotionPreference();
  const x = useMotionValue(0),
    y = useMotionValue(0),
    innerX = useMotionValue(0),
    innerY = useMotionValue(0);
  const sx = useSpring(x, motionTokens.spring),
    sy = useSpring(y, motionTokens.spring),
    ix = useSpring(innerX, motionTokens.spring),
    iy = useSpring(innerY, motionTokens.spring);
  const reset = useCallback(() => {
    x.set(0);
    y.set(0);
    innerX.set(0);
    innerY.set(0);
    bounds.current = null;
  }, [x, y, innerX, innerY]);
  useEffect(() => {
    window.addEventListener('resize', reset);
    return () => window.removeEventListener('resize', reset);
  }, [reset]);
  return (
    <motion.button
      className={`button magnetic-button ${className}`}
      style={{ x: sx, y: sy }}
      onClick={onClick}
      data-cursor="Discover"
      whileTap={reduced ? undefined : { scale: 0.985 }}
      onPointerEnter={(e) => {
        if (
          e.pointerType === 'mouse' &&
          window.innerWidth >= 1000 &&
          !reduced &&
          matchMedia('(hover:hover) and (pointer:fine)').matches
        )
          bounds.current = e.currentTarget.getBoundingClientRect();
      }}
      onPointerMove={(e) => {
        const r = bounds.current;
        if (!r || e.pointerType !== 'mouse' || reduced) return;
        const dx = clamp(
            (e.clientX - r.left - r.width / 2) / (r.width / 2),
            -1,
            1,
          ),
          dy = clamp(
            (e.clientY - r.top - r.height / 2) / (r.height / 2),
            -1,
            1,
          );
        x.set(dx * motionTokens.pointer.magnet);
        y.set(dy * motionTokens.pointer.magnet);
        innerX.set(dx * motionTokens.pointer.text);
        innerY.set(dy * motionTokens.pointer.text);
      }}
      onPointerLeave={reset}
      onBlur={reset}
    >
      <motion.span className="magnetic-inner" style={{ x: ix, y: iy }}>
        <span>{children}</span>
        <ArrowUpRight size={17} />
      </motion.span>
    </motion.button>
  );
}
