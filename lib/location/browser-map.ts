import type { Coordinates } from './contracts';
export type MapHandle = {
  setCenter(point: Coordinates): void;
  setZoom(zoom: number): void;
  remove(): void;
};
export type MapOptions = {
  center: Coordinates;
  zoom: number;
  points: { id: string | null; name: string; coordinates: Coordinates }[];
  select(id: string | null): void;
};
export type MapFactory = (
  element: HTMLElement,
  options: MapOptions,
  signal: AbortSignal,
  ready: () => void,
  failed: () => void,
) => Promise<MapHandle>;
const active = new WeakMap<HTMLElement, () => void>();
// One cancellable owner per container, including Strict Mode and pending imports.
export function mountLocationMap(
  element: HTMLElement,
  options: MapOptions,
  ready: (map: MapHandle) => void,
  failed: () => void,
  factory: MapFactory = async (...args) =>
    (await import('./maplibre-map')).createMap(...args),
  timeoutMs = 12000,
) {
  active.get(element)?.();
  const controller = new AbortController();
  let instance: MapHandle | undefined;
  let loaded = false;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    controller.abort();
    instance?.remove();
    if (active.get(element) === dispose) active.delete(element);
  };
  const fail = () => {
    if (!disposed) {
      dispose();
      failed();
    }
  };
  const reportReady = () => {
    loaded = true;
    if (!disposed && instance) {
      clearTimeout(timer);
      ready(instance);
    }
  };
  const timer = setTimeout(fail, timeoutMs);
  active.set(element, dispose);
  void factory(element, options, controller.signal, reportReady, fail)
    .then((map) => {
      if (disposed) {
        map.remove();
        return;
      }
      instance = map;
      if (loaded) reportReady();
    })
    .catch(fail);
  return dispose;
}
