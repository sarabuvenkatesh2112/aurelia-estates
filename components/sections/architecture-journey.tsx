'use client';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, X } from 'lucide-react';
import { SceneFallback } from '@/components/three/scene-fallback';
import { useSceneProgress } from '@/hooks/use-scene-progress';
import { useMotionPreference } from '@/components/animation/motion-preference';
import { sceneChapters, floors, hotspots } from '@/lib/scene-config';
import { motionTokens } from '@/lib/motion/config';
const Scene = dynamic(() => import('@/components/three/aurelia-scene'), {
  ssr: false,
});
export function ArchitectureJourney() {
  const root = useRef<HTMLElement>(null);
  const { clock, chapter, go } = useSceneProgress(root);
  const { reduced } = useMotionPreference();
  const [eligible, setEligible] = useState(false),
    [near, setNear] = useState(false),
    [active, setActive] = useState(false);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [progress, setProgress] = useState(0);
  const [level, setLevel] = useState(18),
    [selected, setSelected] = useState<string | null>(null);
  const onReady = useCallback(() => setReady(true), []),
    onError = useCallback(() => setFailed(true), []);
  const select = useCallback((id: string) => setSelected(id), []);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const memory = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;
    const suitable =
      !connection?.saveData &&
      (!memory || memory >= 4) &&
      navigator.hardwareConcurrency >= 4;
    let supported = false;
    if (suitable) {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      supported = !!gl;
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    }
    setEligible(supported);
    const preload = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          preload.disconnect();
        }
      },
      { rootMargin: '600px' },
    );
    const visibility = new IntersectionObserver(
      ([e]) => setActive(e.isIntersecting),
      { rootMargin: '100px' },
    );
    preload.observe(element);
    visibility.observe(element);
    return () => {
      preload.disconnect();
      visibility.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!near || ready || failed || !eligible || reduced) return;
    const timer = setTimeout(() => setFailed(true), 45000);
    return () => clearTimeout(timer);
  }, [near, ready, failed, eligible, reduced]);
  const fallback = reduced || failed || !eligible;
  const current = sceneChapters[chapter];
  const detail = hotspots.find(
    (h) => h.id === selected && (fallback || h.chapters.includes(chapter)),
  );
  const floor = floors.find((f) => f.level === level)!;
  return (
    <section
      ref={root}
      id="architecture-journey"
      className="architecture-journey"
      data-static={fallback || undefined}
      data-ready={(ready && !fallback) || undefined}
      aria-label="Aurelia Residence architectural journey"
    >
      <div className="architecture-viewport">
        <div className="scene-media">
          <SceneFallback />
          {near && eligible && !reduced && !failed && (
            <div className="scene-canvas">
              <Scene
                clock={clock}
                root={root}
                chapter={chapter}
                level={level}
                onReady={onReady}
                onError={onError}
                onProgress={setProgress}
                onSelect={select}
                active={active}
              />
            </div>
          )}
          <div className="scene-hero-bridge" aria-hidden="true">
            <Image src="/images/hero.webp" alt="" fill sizes="100vw" />
          </div>
          <div className="scene-exit-bridge" aria-hidden="true">
            <Image src="/images/villa.webp" alt="" fill sizes="100vw" />
          </div>
        </div>
        <div className="scene-vignette" />
        <div className="architecture-topline">
          <span>AURELIA / AN ARCHITECTURAL VISION</span>
          <a href="#residences" data-cursor="Discover">
            Skip to residences <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="scene-copy">
          <p className="eyebrow">
            0{chapter + 1} / {current.name.toUpperCase()}
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={chapter}
              initial={{ opacity: 0, y: reduced ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -12 }}
              transition={{
                duration: reduced ? 0.1 : 0.38,
                ease: motionTokens.curve,
              }}
            >
              <h2>{current.title}</h2>
              <p className="scene-description">{current.text}</p>
            </motion.div>
          </AnimatePresence>
          {(chapter === 3 || fallback) && (
            <div className="scene-floor-panel">
              <div className="floor-tabs" aria-label="Explore residence levels">
                {floors.map((f) => (
                  <button
                    key={f.level}
                    type="button"
                    aria-pressed={level === f.level}
                    data-cursor="View"
                    onPointerEnter={(e) => {
                      if (e.pointerType === 'mouse') setLevel(f.level);
                    }}
                    onClick={() => setLevel(f.level)}
                  >
                    Level {f.level}
                  </button>
                ))}
              </div>
              <p>
                <strong>{floor.title}</strong>
                <span>
                  {floor.area} · {floor.price}
                </span>
              </p>
              <small>Fictional concept residence</small>
            </div>
          )}
        </div>
        {near && eligible && !ready && !failed && !reduced && (
          <output className="scene-loader">
            <span>AURELIA</span>
            <p>Preparing your private view</p>
            <progress
              aria-label="Architectural scene loading"
              max={100}
              value={progress}
            />
          </output>
        )}
        <div className="scene-details">
          <div
            className="scene-detail-links"
            aria-label="Architectural features"
          >
            {hotspots
              .filter((h) => fallback || h.chapters.includes(chapter))
              .map((h) => (
                <button
                  key={h.id}
                  type="button"
                  data-cursor="Explore"
                  aria-expanded={selected === h.id}
                  onPointerEnter={(e) => {
                    if (e.pointerType === 'mouse') setSelected(h.id);
                  }}
                  onClick={() => setSelected(h.id)}
                >
                  {h.index} / {h.name}
                </button>
              ))}
          </div>
          <AnimatePresence>
            {detail && (
              <motion.aside
                className="scene-detail-panel"
                key={detail.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: reduced ? 0.1 : 0.25 }}
                aria-label={detail.name}
              >
                <button
                  type="button"
                  aria-label="Close architectural detail"
                  onClick={() => setSelected(null)}
                >
                  <X size={16} />
                </button>
                <span className="eyebrow">{detail.index} / A CLOSER LOOK</span>
                <h3>{detail.name}</h3>
                <p>{detail.text}</p>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
        <div className="architecture-bottom">
          <nav aria-label="Architectural journey chapters">
            {sceneChapters.map((c, i) => (
              <button
                key={c.name}
                type="button"
                aria-current={i === chapter ? 'step' : undefined}
                aria-label={`Architecture camera ${i + 1}: ${c.name}`}
                onClick={() => go(i)}
              >
                <span>0{i + 1}</span>
                <i>{c.name}</i>
              </button>
            ))}
          </nav>
          <div className="architecture-progress">
            <i />
          </div>
          <p>ORIGINAL ARCHITECTURAL CONCEPT · SCROLL TO EXPLORE</p>
        </div>
      </div>
    </section>
  );
}
