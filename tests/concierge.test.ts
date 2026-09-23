import test from 'node:test';
import assert from 'node:assert/strict';
import { providerFailure } from '../lib/ai/provider-errors';
import {
  emptyFilters,
  filtersSchema,
  mergeHardPreferences,
  safeText,
  safeStreamingPrefix,
  savedFilters,
  toolSchemas,
} from '../lib/ai/contracts';

await test('Streaming validation checks the complete buffer and retains split sensitive tokens', () => {
  assert.equal(safeStreamingPrefix('A short safe response.'), '');
  assert.equal(safeStreamingPrefix('a'.repeat(120)).length, 40);
  assert.throws(() =>
    safeStreamingPrefix('password=fixture-only ' + 'a'.repeat(1850)),
  );
  assert.throws(() => safeStreamingPrefix('a'.repeat(2001)));
  assert.throws(() =>
    safeStreamingPrefix('Verified homes. ' + 'sk-' + 'x'.repeat(32)),
  );
});

await test('Follow-up searches retain omitted hard preferences', () => {
  const saved = {
    ...emptyFilters,
    city: 'Visakhapatnam',
    bhk: 3,
    maxPrice: 20000000,
    amenities: ['swimming-pool'],
  };
  const merged = mergeHardPreferences(
    { ...emptyFilters, minArea: 1800 },
    saved,
  );
  assert.equal(merged.city, saved.city);
  assert.equal(merged.bhk, 3);
  assert.equal(merged.maxPrice, 20000000);
  assert.deepEqual(merged.amenities, saved.amenities);
  assert.equal(merged.minArea, 1800);
});

await test('Concierge filters reject unknown fields, invalid ranges and non-numeric budgets', () => {
  for (const input of [
    { ...emptyFilters, customerId: 'other' },
    { ...emptyFilters, maxPrice: '20000000' },
    { ...emptyFilters, minPrice: 20, maxPrice: 10 },
    { ...emptyFilters, minArea: 5000, maxArea: 1000 },
    { ...emptyFilters, bhk: 20 },
    { ...emptyFilters, amenities: ['pool; DROP TABLE Unit'] },
  ])
    assert.equal(filtersSchema.safeParse(input).success, false);
  assert.equal(
    filtersSchema.safeParse({
      ...emptyFilters,
      city: 'Chennai',
      bhk: 3,
      maxPrice: 20000000,
      amenities: ['swimming-pool'],
    }).success,
    true,
  );
});
await test('Safe conversation text rejects secrets, HTML and controls without rejecting normal enquiries', () => {
  for (const value of [
    'password=ExampleSecret123!',
    'postgresql://example:secret@localhost/db',
    'sk-' + 'x'.repeat(32),
    'AIza' + 'x'.repeat(35),
    '<script>alert(1)</script>',
    'hello\u0000',
  ])
    assert.equal(safeText.safeParse(value).success, false);
  assert.equal(
    safeText.safeParse(
      'Does this home have a private pool?\nMy budget is ₹2 crore.',
    ).success,
    true,
  );
});

await test('Provider errors expose only allowlisted status metadata, never SDK details', () => {
  assert.deepEqual(
    providerFailure({
      status: 429,
      message: 'key=fixture-only',
      request: { authorization: 'fixture' },
    }),
    { status: 429, code: 'RESOURCE_EXHAUSTED' },
  );
  assert.equal(providerFailure({ status: '429', message: 'fixture' }), null);
  assert.equal(providerFailure(new Error('fixture-only')), null);
});
await test('Tool boundaries reject customer identifiers, arbitrary tools and oversized comparisons', () => {
  assert.equal(
    toolSchemas.my_collection.safeParse({
      section: 'visits',
      customerId: crypto.randomUUID(),
    }).success,
    false,
  );
  assert.equal(
    toolSchemas.project_details.safeParse({ slug: '../../admin' }).success,
    false,
  );
  assert.equal(
    toolSchemas.compare_units.safeParse({
      ids: Array.from({ length: 5 }, () => crypto.randomUUID()),
    }).success,
    false,
  );
  assert.equal(
    toolSchemas.page_context.safeParse({ sql: 'select *' }).success,
    false,
  );
});
await test('Saved searches never silently lose project, tower or floor constraints', () => {
  for (const extra of [{ project: 'aurelia' }, { tower: 'A' }, { floor: 0 }])
    assert.equal(savedFilters({ ...emptyFilters, ...extra }), null);
  assert.deepEqual(
    savedFilters({ ...emptyFilters, city: 'Chennai', maxPrice: 15000000 }),
    {
      city: 'Chennai',
      maxPrice: 15000000,
      amenities: [],
      availability: 'AVAILABLE',
    },
  );
});
