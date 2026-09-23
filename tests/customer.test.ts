import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  nameSchema,
  phoneSchema,
  emailSchema,
  passwordSchema,
  signUpSchema,
  notesSchema,
  profileSchema,
  savedSearchSchema,
  safeReturnPath,
} from '../lib/validation/customer';
import { visitSchema, indiaDate, slotAvailable } from '../lib/validation/forms';
await test('Unicode names normalize and reject unsafe or invented names', () => {
  for (const v of [
    'Venkatesh Sarabu',
    'A. Venkatesh',
    'Anne-Marie',
    "O'Connor",
    'O’Connor',
    'సాయి కుమార్',
    'José García',
  ])
    assert.ok(nameSchema.safeParse(v).success);
  assert.equal(nameSchema.parse('  Mary   Anne  '), 'Mary Anne');
  for (const v of [
    '12345',
    'Venky123',
    ' ',
    '<script>',
    'https://example.com',
    'user@example.com',
    'A'.repeat(61),
    'Anne?Marie',
    'A\u0000B',
  ])
    assert.equal(nameSchema.safeParse(v).success, false);
});
await test('Indian mobile numbers normalize to E.164', () => {
  for (const v of [
    '9876543210',
    '+91 9876543210',
    '+91-9876543210',
    '98765 43210',
  ])
    assert.equal(phoneSchema.parse(v), '+919876543210');
  for (const v of [
    '1234567890',
    '5876543210',
    '987654321',
    '98765432100',
    '98AB543210',
    'abcdefghij',
    '9999999999',
  ])
    assert.equal(phoneSchema.safeParse(v).success, false);
});
await test('Mature email validation and case normalization', () => {
  for (const v of ['user@example.com', 'user.name+property@example.co.in'])
    assert.ok(emailSchema.safeParse(v).success);
  assert.equal(emailSchema.parse(' User@EXAMPLE.COM '), 'user@example.com');
  for (const v of [
    'user',
    'user@',
    '@gmail.com',
    'user gmail@gmail.com',
    'user@@gmail.com',
    'venky@gmail',
    'a..b@gmail.com',
  ])
    assert.equal(emailSchema.safeParse(v).success, false);
});
await test('Password strength, exact confirmation and terms are required', () => {
  for (const v of [
    'short',
    'all-lowercase-only',
    'NoNumbers!',
    'NoSpecial123',
    'NOSMALL1!',
    ' '.repeat(12),
    'Aa1!'.repeat(33),
  ])
    assert.equal(passwordSchema.safeParse(v).success, false);
  const password = 'Fictional Strong1!';
  assert.equal(passwordSchema.parse(password), password);
  const user = {
    name: 'Fictional Customer',
    phone: '9876543210',
    email: 'a@example.test',
    password,
    confirmPassword: password,
    terms: true,
  };
  assert.ok(signUpSchema.safeParse(user).success);
  assert.equal(
    signUpSchema.safeParse({ ...user, confirmPassword: 'different' }).success,
    false,
  );
  assert.equal(
    signUpSchema.safeParse({ ...user, terms: false }).success,
    false,
  );
});
await test('Booking rules use IST dates, known future slots and bounded notes', () => {
  assert.equal(indiaDate(new Date('2026-09-12T20:00:00Z')), '2026-09-13');
  assert.equal(
    slotAvailable('2026-09-13', '09:00', new Date('2026-09-13T04:00:00Z')),
    false,
  );
  assert.equal(
    slotAvailable('2026-09-13', '10:00', new Date('2026-09-13T04:00:00Z')),
    true,
  );
  const data = {
    idempotencyKey: randomUUID(),
    projectId: randomUUID(),
    name: 'Test Customer',
    phone: '9876543210',
    email: 'qa@example.test',
    preferredDate: new Date(Date.now() + 2 * 86400000)
      .toISOString()
      .slice(0, 10),
    preferredTime: '11:00',
    guestCount: 1,
  };
  assert.ok(visitSchema.safeParse(data).success);
  for (const v of [
    { preferredDate: '2020-01-01' },
    { preferredDate: '2026-02-31' },
    { preferredTime: '03:17' },
    { guestCount: 0 },
    { message: '<script>alert(1)</script>' },
  ])
    assert.equal(visitSchema.safeParse({ ...data, ...v }).success, false);
  assert.equal(
    notesSchema.parse('  A quiet introduction.  '),
    'A quiet introduction.',
  );
  assert.equal(notesSchema.safeParse('a'.repeat(501)).success, false);
});
await test('Mass assignment, invalid saved filters and external redirects are rejected', () => {
  assert.equal(
    profileSchema.safeParse({
      name: 'Test Customer',
      phone: '9876543210',
      id: randomUUID(),
    }).success,
    false,
  );
  for (const filters of [
    { minPrice: 5, maxPrice: 1 },
    { page: 0 },
    { pageSize: 99 },
    { availability: 'FAKE' },
    { maxPrice: -1 },
  ])
    assert.equal(
      savedSearchSchema.safeParse({ name: 'My search', filters }).success,
      false,
    );
  for (const value of [
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/ok\n//evil.test',
  ])
    assert.equal(safeReturnPath(value), '/account');
  assert.equal(safeReturnPath('/residences?city=Goa'), '/residences?city=Goa');
});
