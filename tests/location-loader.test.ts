import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGoogleMaps, onMapFailure } from '../lib/location/google-maps';
await test('Map loader is on-demand, singleton, bounded and reports failure without logging credentials', async () => {
  const old = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  let scripts = 0,
    failures = 0,
    timer: (() => void) | undefined;
  const script: {
    id?: string;
    src?: string;
    async?: boolean;
    onerror?: () => void;
  } = {};
  try {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    await assert.rejects(loadGoogleMaps(), /Map unavailable/);
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        createElement: () => script,
        head: {
          appendChild: () => {
            scripts++;
          },
        },
      },
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        setTimeout: (callback: () => void, ms: number) => {
          timer = callback;
          assert.equal(ms, 12000);
          return 1;
        },
      },
    });
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY =
      'offline-only-browser-fixture';
    const unsubscribe = onMapFailure(() => failures++);
    const first = loadGoogleMaps(),
      second = loadGoogleMaps();
    const rejection = assert.rejects(first, /Map unavailable/);
    assert.equal(first, second);
    assert.equal(scripts, 1);
    assert.equal(new URL(script.src!).hostname, 'maps.googleapis.com');
    assert.equal(new URL(script.src!).searchParams.get('loading'), 'async');
    timer!();
    await rejection;
    assert.equal(failures, 1);
    unsubscribe();
    script.onerror!();
    assert.equal(failures, 1);
    await assert.rejects(loadGoogleMaps(), /Map unavailable/);
    assert.equal(scripts, 1);
  } finally {
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'document');
    if (old === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    else process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = old;
  }
});
