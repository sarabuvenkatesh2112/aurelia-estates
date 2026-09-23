import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { parseSearch, intentFilters } from '../lib/validation/search';
import {
  enquirySchema,
  visitSchema,
  normalizedPhone,
} from '../lib/validation/forms';
import { formatRupees } from '../lib/format';
await test('rupee formatting uses numeric Indian units', () => {
  assert.equal(formatRupees(7800000), '₹78 L');
  assert.equal(formatRupees(11800000), '₹1.18 Cr');
  assert.equal(formatRupees(1234560000), '₹123.46 Cr');
});
await test('search parser validates combined ranges, enums and pagination', () => {
  const f = parseSearch(
    new URLSearchParams(
      'city=visakhapatnam&bhk=3&maxPrice=12000000&amenities=gym,concierge&page=2',
    ),
  );
  assert.equal(f.bhk, 3);
  assert.equal(f.maxPrice, 12000000);
  assert.deepEqual(f.amenities, ['gym', 'concierge']);
  assert.equal(f.page, 2);
  for (const query of [
    'page=-1',
    'pageSize=200',
    'maxPrice=NaN',
    'bhk=99',
    'status=INVALID',
    'minPrice=200&maxPrice=100',
    'minArea=20&maxArea=10',
    'possessionBefore=2026-02-31',
  ])
    assert.throws(() => parseSearch(new URLSearchParams(query)));
});
await test('recommendation intent converts budgets without canned projects', () => {
  const f = intentFilters('Show 3BHK below 120 Lakhs in Vizag', [
    'Visakhapatnam',
  ]);
  assert.equal(f.maxPrice, 12000000);
  assert.equal(f.city, 'Visakhapatnam');
  assert.equal(f.bhk, 3);
  assert.equal(f.availability, 'AVAILABLE');
});
const contact = {
  idempotencyKey: randomUUID(),
  projectId: randomUUID(),
  name: 'Fictional QA Visitor',
  email: 'qa@example.test',
  phone: '+91 90000 00000',
  message: 'Fictional integration enquiry.',
};
await test('contact validation rejects malformed values and normalizes identity', () => {
  assert.equal(enquirySchema.parse(contact).phone, '+919000000000');
  assert.equal(normalizedPhone('+919000000000'), '+919000000000');
  for (const patch of [
    { email: 'bad' },
    { phone: '12' },
    { name: 'x' },
    { projectId: 'fake' },
    { message: '<script>' },
    { website: 'spam' },
  ])
    assert.equal(
      enquirySchema.safeParse({ ...contact, ...patch }).success,
      false,
    );
});
await test('visit validation accepts only future dates, allowed times and bounded guests', () => {
  const future = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const visit = {
    ...contact,
    preferredDate: future,
    preferredTime: '11:00',
    guestCount: 2,
  };
  assert.ok(visitSchema.safeParse(visit).success);
  for (const patch of [
    { preferredDate: '2020-01-01' },
    { preferredTime: '03:30' },
    { guestCount: 0 },
    { guestCount: 11 },
  ])
    assert.equal(visitSchema.safeParse({ ...visit, ...patch }).success, false);
});
