'use client';
import { Html } from '@react-three/drei';
import { hotspots } from '@/lib/scene-config';
export function SceneHotspot({
  chapter,
  onSelect,
}: {
  chapter: number;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {hotspots
        .filter((h) => h.chapters.includes(chapter))
        .map((h) => (
          <Html key={h.id} position={h.position} center zIndexRange={[10, 1]}>
            <button
              type="button"
              className="scene-marker"
              data-cursor="Explore"
              aria-label={`Explore ${h.name}`}
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') onSelect(h.id);
              }}
              onClick={() => onSelect(h.id)}
            >
              <span>{h.index}</span>
              <i />
              <span>{h.name}</span>
            </button>
          </Html>
        ))}
    </>
  );
}
