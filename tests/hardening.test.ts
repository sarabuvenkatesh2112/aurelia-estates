import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationUrl, secureApplicationCookie } from '../lib/site-url';
import { trustedClientIp } from '../lib/auth/request-ip';
import { sameOrigin, errorResponse } from '../lib/http';

await test('production URLs fail closed without an origin and reject unsafe URL parts', () => {
  assert.throws(() => applicationUrl('', true));
  assert.equal(applicationUrl('', false), 'http://localhost:3000');
  assert.equal(
    applicationUrl('https://aurelia.example', true),
    'https://aurelia.example',
  );
  for (const value of [
    'http://aurelia.example',
    'https://user:secret@aurelia.example',
    'https://aurelia.example/path',
    'https://aurelia.example/?key=x',
    'javascript:alert(1)',
  ])
    assert.throws(() => applicationUrl(value, true));
});
await test('client identity trusts only a configured ingress-overwritten single IP', () => {
  const h = new Headers({
    'x-forwarded-for': '198.51.100.99',
    'x-aurelia-client': '198.51.100.98',
  });
  assert.equal(trustedClientIp(h), '127.0.0.1');
  assert.throws(() => trustedClientIp(h, undefined, true));
  assert.throws(() => trustedClientIp(h, 'x-forwarded-for', true));
  assert.throws(() => trustedClientIp(h, 'x-real-ip', true));
  h.set('x-real-ip', '198.51.100.1');
  assert.equal(trustedClientIp(h, 'x-real-ip', true), '198.51.100.1');
  h.set('x-real-ip', '198.51.100.2');
  assert.equal(trustedClientIp(h, 'x-real-ip', true), '198.51.100.2');
  h.set('x-real-ip', '198.51.100.1, 198.51.100.2');
  assert.throws(() => trustedClientIp(h, 'x-real-ip', true));
  h.set('x-real-ip', '2001:db8::1');
  assert.equal(trustedClientIp(h, 'x-real-ip', true), '2001:db8::1');
});
await test('origin validation handles local bind hosts and HTTPS ingress without trusting forwarded hosts', () => {
  const previous = process.env.AUTH_BASE_URL;
  try {
    process.env.AUTH_BASE_URL = 'http://localhost:3000';
    assert.equal(
      sameOrigin(
        new Request('http://0.0.0.0:3000/api/', {
          headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        }),
      ),
      true,
    );
    process.env.AUTH_BASE_URL = 'https://aurelia.example';
    assert.equal(secureApplicationCookie('http://internal:3000'), true);
    const request = (origin: string) =>
      new Request('http://internal:3000/api/', {
        headers: {
          host: 'internal:3000',
          origin,
          'x-forwarded-host': 'evil.example',
        },
      });
    assert.equal(sameOrigin(request('https://aurelia.example')), true);
    for (const origin of [
      'http://aurelia.example',
      'https://evil.example',
      'null',
      'not a URL',
      'https://aurelia.example/path',
    ])
      assert.equal(sameOrigin(request(origin)), false);
  } finally {
    if (previous === undefined) delete process.env.AUTH_BASE_URL;
    else process.env.AUTH_BASE_URL = previous;
  }
});
await test('unexpected server errors never disclose internals', async () => {
  const response = errorResponse(new Error('private database diagnostic'));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.text()).includes('private database'), false);
});
