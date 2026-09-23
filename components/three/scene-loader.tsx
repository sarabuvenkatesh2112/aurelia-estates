'use client';
import { useProgress } from '@react-three/drei';
import { useEffect } from 'react';
export function SceneLoader({
  onProgress,
}: {
  onProgress: (n: number) => void;
}) {
  const progress = useProgress((s) => s.progress);
  useEffect(() => onProgress(progress), [progress, onProgress]);
  return null;
}
