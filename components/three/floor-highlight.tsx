'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import { Mesh, MeshStandardMaterial, type Object3D } from 'three';
import type { SceneClock } from '@/lib/scene-config';
export function FloorHighlight({
  model,
  clock,
  level,
}: {
  model: Object3D;
  clock: RefObject<SceneClock>;
  level: number;
}) {
  const { gl } = useThree();
  const previous = useRef('');
  const materials = useRef<MeshStandardMaterial[]>([]);
  useEffect(() => {
    const originals: { mesh: Mesh; material: MeshStandardMaterial }[] = [];
    for (const floor of [18, 22]) {
      const mesh = model.getObjectByName(`Floor_${floor}_Highlight`);
      if (
        mesh instanceof Mesh &&
        mesh.material instanceof MeshStandardMaterial
      ) {
        originals.push({ mesh, material: mesh.material });
        mesh.material = mesh.material.clone();
        materials.current.push(mesh.material);
      }
    }
    return () => {
      for (const { mesh, material } of originals) {
        (mesh.material as MeshStandardMaterial).dispose();
        mesh.material = material;
      }
      materials.current = [];
    };
  }, [model]);
  useFrame(() => {
    const state =
      clock.current.value > 0.43 && clock.current.value < 0.71
        ? String(level)
        : 'none';
    if (previous.current !== state) {
      previous.current = state;
      gl.domElement.setAttribute('data-floor', state);
    }
    for (const floor of [18, 22]) {
      const mesh = model.getObjectByName(`Floor_${floor}_Highlight`);
      if (
        mesh instanceof Mesh &&
        mesh.material instanceof MeshStandardMaterial
      ) {
        mesh.visible = clock.current.value > 0.43 && clock.current.value < 0.71;
        mesh.material.emissive.set('#c9944a');
        mesh.material.emissiveIntensity = floor === level ? 0.85 : 0.1;
      }
    }
  });
  return null;
}
