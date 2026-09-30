import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mountLocationMap,
  type MapFactory,
  type MapHandle,
  type MapOptions,
} from '../lib/location/browser-map';
import { mapConfig } from '../lib/location/map-config';
import { loadMapLibre } from '../lib/location/maplibre-map';
const options: MapOptions = {
  center: { lat: 22, lng: 79 },
  zoom: 3.5,
  points: [],
  select() {},
};
const tick = () => new Promise((resolve) => setImmediate(resolve));
await test('Public tile configuration defaults without a key and rejects unsafe provider configuration', () => {
  assert.equal(
    mapConfig()?.tileUrl,
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  );
  for (const url of [
    'javascript:alert(1)',
    'https://user:secret@example.test/{z}/{x}/{y}',
    'https://example.test/{z}/{x}/{y}?key=secret',
    'https://example.test/no-template',
  ])
    assert.equal(mapConfig(url), null);
  assert.equal(mapConfig(undefined, '<script>'), null);
  assert.ok(
    mapConfig('https://tiles.example.test/{z}/{x}/{y}.png', 'Example provider'),
  );
});
await test('Map ownership cancels pending mount, prevents duplicate instances and cleans once', async () => {
  const element = {} as HTMLElement;
  let removed = 0,
    ready = 0;
  const signals: AbortSignal[] = [];
  const resolve: ((map: MapHandle) => void)[] = [];
  const factory: MapFactory = async (_el, _opts, signal, onReady) => {
    signals.push(signal);
    onReady();
    return new Promise<MapHandle>((r) => resolve.push(r));
  };
  const handle = () => ({
    setCenter() {},
    setZoom() {},
    remove() {
      removed++;
    },
  });
  const first = mountLocationMap(
    element,
    options,
    () => ready++,
    () => assert.fail('unexpected failure'),
    factory,
  );
  const second = mountLocationMap(
    element,
    options,
    () => ready++,
    () => assert.fail('unexpected failure'),
    factory,
  );
  assert.equal(signals[0].aborted, true);
  resolve[0](handle());
  resolve[1](handle());
  await tick();
  assert.equal(removed, 1);
  assert.equal(ready, 1);
  first();
  second();
  second();
  assert.equal(removed, 2);
  assert.equal(signals[1].aborted, true);
});
await test('Provider failure and startup timeout restore fallback, abort and remove resources', async () => {
  let failed = 0,
    removed = 0;
  const broken: MapFactory = async () => {
    throw Error('private provider error');
  };
  const close = mountLocationMap(
    {} as HTMLElement,
    options,
    () => assert.fail('unexpected ready'),
    () => failed++,
    broken,
  );
  await tick();
  close();
  assert.equal(failed, 1);
  const pending: MapFactory = async () => ({
    setCenter() {},
    setZoom() {},
    remove() {
      removed++;
    },
  });
  mountLocationMap(
    {} as HTMLElement,
    options,
    () => assert.fail('unexpected ready'),
    () => failed++,
    pending,
    5,
  );
  await new Promise((r) => setTimeout(r, 15));
  assert.equal(failed, 2);
  assert.equal(removed, 1);
});
await test('MapLibre JS/CSS assets are requested once, only on demand, and CSS failures reject safely', async () => {
  let links = 0;
  const css: { onerror?: () => void; href?: string } = {};
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => css,
      head: {
        appendChild() {
          links++;
        },
      },
    },
  });
  try {
    assert.equal(links, 0);
    const first = loadMapLibre(),
      second = loadMapLibre();
    assert.equal(first, second);
    assert.equal(links, 1);
    const rejected = assert.rejects(first, /Map unavailable/);
    assert.equal(css.href, '/vendor/maplibre-gl.css');
    css.onerror!();
    await rejected;
  } finally {
    Reflect.deleteProperty(globalThis, 'document');
  }
});
