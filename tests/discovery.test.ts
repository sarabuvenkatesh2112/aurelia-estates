import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProperties,
  recommendProperties,
  emptyFilters,
  formatPrice,
} from '../lib/discovery';
import { properties } from '../data/properties';
await test('collection has unique, complete and internally plausible listings', () => {
  assert.equal(properties.length, 8);
  assert.equal(new Set(properties.map((p) => p.id)).size, 8);
  for (const p of properties) {
    assert.ok(p.area > 1000 && p.price > 0 && p.bedrooms >= 3);
    assert.ok(
      p.description.length > 70 &&
        p.amenities.length >= 4 &&
        p.landmarks.length >= 2,
    );
    assert.ok(p.possession && p.developer && p.neighbourhood);
  }
});
await test('all four filters compose and clearing restores the collection', () => {
  assert.equal(
    filterProperties({
      ...emptyFilters,
      city: 'Visakhapatnam',
      type: 'Apartment',
      bedrooms: '3',
      price: '1.2',
    }).length,
    2,
  );
  assert.equal(
    filterProperties({ ...emptyFilters, city: 'Goa', type: 'Apartment' })
      .length,
    0,
  );
  assert.equal(filterProperties(emptyFilters).length, 8);
});
await test('assistant applies currency budget and city, not just canned responses', () => {
  assert.deepEqual(
    recommendProperties(
      'Show 3BHK under ₹1.2 Cr in Visakhapatnam',
    ).properties.map((p) => p.id),
    ['AE-VTZ-004', 'AE-VTZ-005'],
  );
  assert.equal(
    recommendProperties('3 BHK below 110 Lakhs in Vizag').properties[0].id,
    'AE-VTZ-005',
  );
  assert.equal(
    recommendProperties('villas in Goa').properties[0].id,
    'AE-GOA-002',
  );
});
await test('unavailable and unknown requests have transparent fallback', () => {
  assert.equal(
    recommendProperties('5 BHK under 1 Cr in Hyderabad').properties.length,
    0,
  );
  assert.match(recommendProperties('hello').message, /Try adding a city/);
});
await test('prices use Indian units', () => {
  assert.equal(formatPrice(0.85), '₹85 Lakhs');
  assert.equal(formatPrice(1.18), '₹1.18 Cr');
  assert.equal(formatPrice(6.4), '₹6.4 Cr');
});
