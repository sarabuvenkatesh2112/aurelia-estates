import type { Coordinates } from './contracts';
type Listener = { remove(): void };
export type GoogleMap = {
  setCenter(point: Coordinates): void;
  setZoom(zoom: number): void;
};
export type GoogleMarker = {
  map: GoogleMap | null;
  addListener(name: string, callback: () => void): Listener;
};
type MapsApi = {
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => GoogleMap;
  marker: {
    AdvancedMarkerElement: new (
      options: Record<string, unknown>,
    ) => GoogleMarker;
  };
  event: { clearInstanceListeners(instance: object): void };
};
declare global {
  interface Window {
    google?: { maps: MapsApi };
    aureliaMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}
let loading: Promise<MapsApi> | undefined;
let failed = false;
const failures = new Set<() => void>();
export function onMapFailure(callback: () => void) {
  failures.add(callback);
  return () => {
    failures.delete(callback);
  };
}
export function loadGoogleMaps(): Promise<MapsApi> {
  if (failed) return Promise.reject(new Error('Map unavailable'));
  if (loading) return loading;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error('Map unavailable'));
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => {
      failed = true;
      clearTimeout(timeout);
      failures.forEach((fn) => fn());
      reject(new Error('Map unavailable'));
    };
    const timeout = window.setTimeout(fail, 12000);
    window.gm_authFailure = fail;
    window.aureliaMapsReady = () => {
      clearTimeout(timeout);
      if (!failed && window.google?.maps?.marker) resolve(window.google.maps);
      else fail();
      delete window.aureliaMapsReady;
    };
    script.id = 'aurelia-google-maps';
    script.async = true;
    script.src =
      'https://maps.googleapis.com/maps/api/js?' +
      new URLSearchParams({
        key,
        loading: 'async',
        callback: 'aureliaMapsReady',
        libraries: 'marker',
        v: 'quarterly',
        auth_referrer_policy: 'origin',
      });
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}
