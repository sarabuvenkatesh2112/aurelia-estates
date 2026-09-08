'use client';
import type { ImageLoaderProps } from 'next/image';
/** Static, locally optimized image variants. No image service or runtime required. */
export default function imageLoader({ src, width }: ImageLoaderProps): string {
  if (!src.startsWith('/images/') || !src.endsWith('.webp')) return src;
  const variant = width <= 640 ? 640 : width <= 1200 ? 1200 : 1800;
  return variant === 1800 ? src : src.replace('.webp', `-${variant}.webp`);
}
