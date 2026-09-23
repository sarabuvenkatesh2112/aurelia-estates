'use client';
import { useLayoutEffect, useEffectEvent, type RefObject } from 'react';
import { useMotionPreference } from '@/components/animation/motion-preference';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motionQueries, type SceneConditions } from '@/lib/motion/config';
export type SceneBuilder = (conditions: SceneConditions) => void | (() => void);
/** Media context owns animation cleanup. The event reads current refs without rebuilding on chapter updates. */
export function useMotionScene(
  scope: RefObject<HTMLElement | null>,
  build: SceneBuilder,
  revision: unknown = null,
) {
  const { reduced } = useMotionPreference();
  const create = useEffectEvent(build);
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia(scope.current || undefined);
    media.add(motionQueries, (ctx) =>
      create({
        ...(ctx.conditions as unknown as SceneConditions),
        reduced: reduced || !!ctx.conditions?.reduced,
      }),
    );
    return () => media.revert();
  }, [scope, revision, reduced]);
}
