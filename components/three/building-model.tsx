'use client';
import { useGLTF } from '@react-three/drei';
import { useEffect, useState, type RefObject } from 'react';
import { Mesh } from 'three';
import { FloorHighlight } from './floor-highlight';
import type { SceneClock } from '@/lib/scene-config';
export function BuildingModel({
  clock,
  level,
  onReady,
}: {
  clock: RefObject<SceneClock>;
  level: number;
  onReady: () => void;
}) {
  const gltf = useGLTF('/models/aurelia-residence.glb', false, false);
  const [model] = useState(() => gltf.scene.clone(true));
  useEffect(() => {
    model.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    onReady();
  }, [model, onReady]);
  return (
    <>
      <primitive object={model} dispose={null} />
      <FloorHighlight model={model} clock={clock} level={level} />
    </>
  );
}
