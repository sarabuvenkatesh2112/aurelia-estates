'use client';
import { Environment, Lightformer } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';
import type { DirectionalLight } from 'three';
import type { SceneClock } from '@/lib/scene-config';
export function SceneLighting({
  clock,
  desktop,
}: {
  clock: RefObject<SceneClock>;
  desktop: boolean;
}) {
  const sun = useRef<DirectionalLight>(null);
  useFrame(() => {
    if (sun.current)
      sun.current.intensity =
        3.2 + Math.sin(clock.current.value * Math.PI) * 0.35;
  });
  return (
    <>
      <Environment resolution={128} frames={1} environmentIntensity={0.65}>
        <Lightformer
          form="rect"
          intensity={2}
          color="#ede5d0"
          scale={[80, 100, 1]}
          position={[-65, 50, 30]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.5}
          color="#bdced3"
          scale={[70, 90, 1]}
          position={[65, 50, 0]}
          rotation={[0, -Math.PI / 2, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2}
          color="#f3eee3"
          scale={[90, 80, 1]}
          position={[0, 60, 90]}
        />
      </Environment>
      <hemisphereLight args={['#eee6d3', '#7c8069', 2.2]} />
      <directionalLight
        ref={sun}
        position={[-55, 100, 70]}
        color="#ffe0ac"
        intensity={3.2}
        castShadow={desktop}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-65}
        shadow-camera-right={65}
        shadow-camera-top={110}
        shadow-camera-bottom={-40}
        shadow-camera-far={260}
        shadow-normalBias={0.3}
      />
      <directionalLight
        position={[70, 55, -45]}
        color="#b5d1dc"
        intensity={1.5}
      />
    </>
  );
}
