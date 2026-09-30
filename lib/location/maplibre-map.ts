import type { MapFactory } from './browser-map';
import { coordinatesSchema } from './contracts';
import { mapConfig } from './map-config';
let assets: Promise<typeof import('maplibre-gl')> | undefined;
export function loadMapLibre() {
  return (assets ??= Promise.all([
    import('maplibre-gl'),
    new Promise<void>((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = '/vendor/maplibre-gl.css';
      css.id = 'aurelia-maplibre-style';
      css.onload = () => resolve();
      css.onerror = () => reject(Error('Map unavailable'));
      document.head.appendChild(css);
    }),
  ]).then(([api]) => api));
}
export const createMap: MapFactory = async (
  element,
  options,
  signal,
  ready,
  failed,
) => {
  coordinatesSchema.parse(options.center);
  const response = await fetch('/api/location/map-config/', { signal });
  if (!response.ok) throw Error('Map unavailable');
  const raw = await response.json();
  const config = raw && mapConfig(raw.tileUrl, raw.attribution);
  if (!config) throw Error('Map unavailable');
  const api = await loadMapLibre();
  signal.throwIfAborted();
  // Explicit same-origin module worker; bundlers relocate import.meta.url.
  api.setWorkerUrl('/vendor/maplibre-gl-worker.mjs');
  // Explicit same-origin module worker; bundlers relocate import.meta.url.
  api.setWorkerUrl('/vendor/maplibre-gl-worker.mjs');
  const instance = new api.Map({
    container: element,
    center: [options.center.lng, options.center.lat],
    zoom: options.zoom,
    maxZoom: 18,
    cooperativeGestures: true,
    scrollZoom: false,
    dragRotate: false,
    pitchWithRotate: false,
    attributionControl: false,
    renderWorldCopies: false,
    style: {
      version: 8,
      sources: {
        streets: {
          type: 'raster',
          tiles: [config.tileUrl],
          tileSize: 256,
          maxzoom: 19,
        },
      },
      layers: [{ id: 'streets', type: 'raster', source: 'streets' }],
    },
  });
  const markers: {
    marker: import('maplibre-gl').Marker;
    button: HTMLButtonElement;
    click: () => void;
  }[] = [];
  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    instance.off('load', ready);
    instance.off('error', failed);
    markers.forEach(({ marker, button, click }) => {
      button.removeEventListener('click', click);
      marker.remove();
    });
    instance.remove();
  };
  try {
    instance.on('load', ready);
    instance.on('error', failed);
    instance.addControl(
      new api.NavigationControl({ showCompass: false }),
      'top-right',
    );
    const safeCredit = config.attribution.replaceAll('&', '&amp;');
    instance.addControl(
      new api.AttributionControl({
        compact: false,
        customAttribution: `&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors${safeCredit === 'OpenStreetMap contributors' ? '' : ` | ${safeCredit}`}`,
      }),
      'bottom-right',
    );
    for (const point of options.points) {
      if (!coordinatesSchema.safeParse(point.coordinates).success) continue;
      const button = document.createElement('button');
      button.className = 'location-marker';
      button.type = 'button';
      button.textContent = '\u25cf';
      button.setAttribute('aria-label', point.name);
      const click = () => options.select(point.id);
      button.addEventListener('click', click);
      const marker = new api.Marker({ element: button })
        .setLngLat([point.coordinates.lng, point.coordinates.lat])
        .addTo(instance);
      markers.push({ marker, button, click });
    }
    instance
      .getCanvas()
      .setAttribute(
        'aria-label',
        'Interactive street map. Use zoom buttons; scroll to continue the page.',
      );
    return {
      setCenter: (p) => instance.setCenter([p.lng, p.lat]),
      setZoom: (z) => instance.setZoom(z),
      remove,
    };
  } catch (error) {
    remove();
    throw error;
  }
};
