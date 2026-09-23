'use client';
import { ScenePerformance } from './scene-performance';
import { Canvas, useThree } from '@react-three/fiber';
import {
  Suspense,
  useEffect,
  useState,
  Component,
  type ReactNode,
  type RefObject,
} from 'react';
import { BuildingModel } from './building-model';
import { CameraRig } from './camera-rig';
import { SceneLighting } from './scene-lighting';
import { SceneLoader } from './scene-loader';
import { SceneHotspot } from './scene-hotspot';
import { usePointerParallax } from '@/hooks/use-pointer-parallax';
import type { SceneClock } from '@/lib/scene-config';
class CanvasBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function Lifecycle({
  clock,
  onError,
  active,
}: {
  clock: RefObject<SceneClock>;
  onError: () => void;
  active: boolean;
}) {
  const { gl, invalidate, setFrameloop } = useThree();
  useEffect(() => {
    const source = clock.current;
    source.connect(invalidate);
    const canvas = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    canvas.addEventListener('webglcontextlost', lost);
    return () => {
      source.connect(() => {});
      canvas.removeEventListener('webglcontextlost', lost);
    };
  }, [clock, gl, invalidate, onError]);
  useEffect(() => {
    setFrameloop(active ? 'demand' : 'never');
    if (active) invalidate();
  }, [active, invalidate, setFrameloop]);
  return null;
}
export default function AureliaScene({
  clock,
  root,
  chapter,
  level,
  onReady,
  onError,
  onProgress,
  onSelect,
  active,
}: {
  clock: RefObject<SceneClock>;
  root: RefObject<HTMLElement | null>;
  chapter: number;
  level: number;
  onReady: () => void;
  onError: () => void;
  onProgress: (n: number) => void;
  onSelect: (id: string) => void;
  active: boolean;
}) {
  const invalidate = () => clock.current.invalidate();
  const pointer = usePointerParallax(root, invalidate);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const m = matchMedia('(min-width: 1100px)');
    const update = () => setDesktop(m.matches);
    update();
    m.addEventListener('change', update);
    return () => m.removeEventListener('change', update);
  }, []);
  return (
    <CanvasBoundary onError={onError}>
      <Canvas
        frameloop="demand"
        dpr={desktop ? [1, 1.5] : [1, 1]}
        shadows={desktop}
        camera={{ position: [122, 111, 158], fov: 42, near: 1, far: 600 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        fallback={null}
      >
        <Lifecycle clock={clock} onError={onError} active={active} />
        <CameraRig clock={clock} pointer={pointer} />
        <ScenePerformance />
        <SceneLighting clock={clock} desktop={desktop} />
        <Suspense fallback={null}>
          <BuildingModel clock={clock} level={level} onReady={onReady} />
          <SceneHotspot chapter={chapter} onSelect={onSelect} />
        </Suspense>
        <SceneLoader onProgress={onProgress} />
      </Canvas>
    </CanvasBoundary>
  );
}
