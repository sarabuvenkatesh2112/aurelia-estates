'use client';
import { useMotionPreference } from '@/components/animation/motion-preference';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { motionTokens } from '@/lib/motion/config';
export function CinematicImage({
  src,
  alt,
  sizes,
  direction = 'horizontal',
}: {
  src: string;
  alt: string;
  sizes: string;
  direction?: 'horizontal' | 'vertical';
}) {
  const { reduced } = useMotionPreference();
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={src}
        className="cinematic-image"
        initial={
          reduced
            ? { opacity: 0 }
            : {
                clipPath:
                  direction === 'horizontal'
                    ? 'inset(0% 0% 0% 100%)'
                    : 'inset(100% 0% 0% 0%)',
                scale: 1.12,
              }
        }
        animate={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: reduced ? 0.12 : 0.85,
          ease: motionTokens.curve,
        }}
      >
        <Image src={src} alt={alt} fill sizes={sizes} />
      </motion.div>
    </AnimatePresence>
  );
}
