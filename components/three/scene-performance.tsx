'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
/** Bounded diagnostics on the canvas; no React updates in the render loop. */
export function ScenePerformance() {
  const { gl, setDpr } = useThree();
  const sample = useRef({
    frames: 0,
    ms: [] as number[],
    slow: 0,
    limited: false,
  });
  useFrame((state, delta) => {
    const s = sample.current;
    s.frames++;
    if (delta > 0 && delta < 0.12) {
      s.ms.push(delta * 1000);
      if (s.ms.length > 90) s.ms.shift();
    }
    if (s.frames > 30 && delta > 0.04 && delta < 0.12) s.slow++;
    if (s.slow > 25 && !s.limited) {
      s.limited = true;
      setDpr(1);
    }
    if (s.frames % 20 === 0) {
      const canvas = gl.domElement;
      const sorted = [...s.ms].sort((a, b) => a - b);
      canvas.setAttribute(
        'data-frame-ms',
        String(Math.round(sorted[Math.floor(sorted.length / 2)] || 0)),
      );
      canvas.setAttribute('data-draw-calls', String(gl.info.render.calls));
      canvas.setAttribute('data-triangles', String(gl.info.render.triangles));
      canvas.setAttribute('data-geometries', String(gl.info.memory.geometries));
      canvas.setAttribute('data-textures', String(gl.info.memory.textures));
      canvas.setAttribute(
        'data-camera',
        state.camera.position
          .toArray()
          .map((n) => n.toFixed(2))
          .join(','),
      );
      canvas.setAttribute('data-dpr', gl.getPixelRatio().toFixed(2));
    }
  });
  return null;
}
