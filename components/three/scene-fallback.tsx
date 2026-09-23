'use client';
import Image from 'next/image';
export function SceneFallback() {
  return (
    <div className="scene-fallback">
      <Image
        src="/models/aurelia-arrival.webp"
        alt="Original Aurelia tower with stone terraces, bronze fins and a landscaped private club"
        fill
        sizes="100vw"
        unoptimized
      />
    </div>
  );
}
