'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';
import { Vector3, PerspectiveCamera } from 'three';
import {
  sceneChapters,
  sceneSegment,
  type SceneClock,
} from '@/lib/scene-config';
export function CameraRig({
  clock,
  pointer,
}: {
  clock: RefObject<SceneClock>;
  pointer: RefObject<{ x: number; y: number }>;
}) {
  const { size, invalidate } = useThree();
  const target = useRef(new Vector3());
  const offset = useRef({ x: 0, y: 0 });
  useFrame(({ camera }, delta) => {
    const { a, b, t } = sceneSegment(clock.current.value),
      from = sceneChapters[a],
      to = sceneChapters[b];
    const mobile = window.innerWidth < 768;
    const factor = mobile ? 1.65 : size.width < 1100 ? 1.15 : 1;
    const mix = (x: number, y: number) => x + (y - x) * t;
    const response = 1 - Math.exp(-12 * Math.min(delta, 0.1));
    offset.current.x +=
      ((mobile ? 0 : pointer.current.x * 0.9) - offset.current.x) * response;
    offset.current.y +=
      ((mobile ? 0 : pointer.current.y * 0.45) - offset.current.y) * response;
    const tx = mobile
      ? 0
      : mix(from.target[0], to.target[0]) * (size.width < 1000 ? 2.1 : 1);
    target.current.set(
      tx,
      mix(from.target[1], to.target[1]),
      mix(from.target[2], to.target[2]),
    );
    camera.position.set(
      mix(from.position[0], to.position[0]) * factor + offset.current.x,
      mix(from.position[1], to.position[1]) * factor + offset.current.y,
      mix(from.position[2], to.position[2]) * factor,
    );
    camera.lookAt(target.current);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = mix(from.fov, to.fov);
      camera.updateProjectionMatrix();
    }
    if (
      (Math.abs(offset.current.x - pointer.current.x * 0.9) > 0.001 ||
        Math.abs(offset.current.y - pointer.current.y * 0.45) > 0.001) &&
      !mobile
    )
      invalidate();
  });
  return null;
}
