import test from 'node:test';
import assert from 'node:assert/strict';
import {
  coordinatesSchema,
  locationEditSchema,
  mapsLinks,
  verifiedContext,
} from '../lib/location/contracts';
import { toolSchemas } from '../lib/ai/contracts';
import { can, staffRoles } from '../lib/admin/policy';

await test('Coordinates reject missing pairs, strings, non-finite and out-of-range values', () => {
  for (const point of [
    { lat: 91, lng: 0 },
    { lat: 0, lng: -181 },
    { lat: NaN, lng: 1 },
    { lat: Infinity, lng: 2 },
    { lat: 3 },
    { lat: '3', lng: 4 },
    { lat: 3, lng: 4, url: 'https://untrusted.example' },
  ])
    assert.equal(coordinatesSchema.safeParse(point).success, false);
  assert.equal(
    coordinatesSchema.safeParse({ lat: -90, lng: 180 }).success,
    true,
  );
});
await test('Directions encode trusted database coordinates and never generate unverified site directions', () => {
  const p = {
    city: 'City & destination=evil',
    locality: 'Test/?x=1',
    coordinates: null,
    verified: false,
  };
  const links = mapsLinks(p);
  assert.equal(new URL(links.mapsUrl).origin, 'https://www.google.com');
  assert.equal(
    new URL(links.mapsUrl).searchParams.get('query'),
    `${p.locality}, ${p.city}, India`,
  );
  assert.equal(links.directionsUrl, null);
  const exact = mapsLinks({
    ...p,
    coordinates: { lat: 12.5, lng: 78.2 },
    verified: true,
  });
  assert.equal(
    new URL(exact.directionsUrl!).searchParams.get('destination'),
    '12.5,78.2',
  );
  assert.equal(
    mapsLinks({ ...p, coordinates: { lat: 95, lng: 3 }, verified: true })
      .directionsUrl,
    null,
  );
});
await test('Verified context requires provenance and expires; illustrative values never become facts', () => {
  assert.equal(
    verifiedContext(false, 'Editorial field check', new Date()),
    true,
  );
  assert.equal(verifiedContext(true, 'Source', new Date()), false);
  assert.equal(verifiedContext(false, '', new Date()), false);
  assert.equal(
    verifiedContext(false, 'Source', new Date(Date.now() - 181 * 86400000)),
    false,
  );
  assert.equal(
    verifiedContext(false, 'Source', new Date(Date.now() + 86400000)),
    false,
  );
});
await test('Editor is strict, bounded, and cannot verify without source/address/coordinates', () => {
  const base = {
    version: 0,
    address: null,
    label: null,
    coordinates: null,
    narrative: null,
    source: null,
    verified: false,
    nearby: [],
  };
  assert.equal(locationEditSchema.safeParse(base).success, true);
  for (const delta of [
    { verified: true },
    { version: -1 },
    { customerId: 'other' },
    { narrative: '<script>bad</script>' },
    { nearby: Array(31).fill({}) },
  ])
    assert.equal(
      locationEditSchema.safeParse({ ...base, ...delta }).success,
      false,
    );
});
await test('Location tool rejects URL injection, arbitrary categories, unknown fields and unbounded comparisons', () => {
  assert.equal(
    toolSchemas.location_context.safeParse({
      slugs: ['the-eastern-grove'],
      category: 'HOSPITAL',
    }).success,
    true,
  );
  for (const raw of [
    { slugs: ['https://evil.example'], category: null },
    { slugs: ['../admin'], category: null },
    { slugs: Array(4).fill('home'), category: null },
    { slugs: ['home'], category: 'SQL' },
    { slugs: ['home'], category: null, customerId: 'other' },
  ])
    assert.equal(toolSchemas.location_context.safeParse(raw).success, false);
});
await test('All five staff roles reuse inventory permissions without a new privilege path', () => {
  for (const role of staffRoles)
    assert.equal(
      can(role, 'inventory'),
      role === 'ADMIN' || role === 'SUPER_ADMIN',
    );
});
