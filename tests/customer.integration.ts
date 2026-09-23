import '../scripts/database-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { getDb } from '../lib/db/prisma';
if (process.env.ALLOW_DB_TESTS !== 'true')
  throw Error(
    'Explicit ALLOW_DB_TESTS=true is required; this test creates fictional accounts and requests.',
  );
const db = getDb(),
  base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const password = 'Qa!A9' + randomBytes(24).toString('base64url');
const suffix = randomUUID();
const identities = [
  {
    name: 'Fictional Customer Alpha',
    email: 'phase5-a-' + suffix + '@example.test',
    phone: '+919876543210',
  },
  {
    name: 'Fictional Customer Beta',
    email: 'phase5-b-' + suffix + '@example.test',
    phone: '+919876543211',
  },
];
async function call(path: string, method = 'GET', body?: unknown, cookie = '') {
  const r = await fetch(base + path, {
    method,
    headers: {
      Origin: base,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: 'manual',
  });
  const data = r.headers.get('content-type')?.includes('json')
    ? await r.json()
    : null;
  return {
    status: r.status,
    data,
    cookies: r.headers.getSetCookie(),
    location: r.headers.get('location'),
    html: data === null ? await r.text() : '',
  };
}
let cookieA = '',
  cookieB = '',
  userA = '',
  userB = '',
  favorite = '',
  saved = '',
  visit = '',
  enquiry = '';
await test('Phase 5 authentication, ownership and request lifecycle', async (t) => {
  await t.test(
    'registration, duplicate email, secure hash and session cookie',
    async () => {
      for (const [i, u] of identities.entries()) {
        const r = await call('/api/auth/sign-up/email/', 'POST', {
          ...u,
          password,
          confirmPassword: password,
          terms: true,
        });
        assert.equal(r.status, 200, 'registration status');
        assert.ok(r.data.success);
        assert.equal('token' in r.data, false);
        assert.ok(
          r.cookies.some((c) => /httponly/i.test(c) && /samesite=lax/i.test(c)),
        );
        const cookie = r.cookies.map((c) => c.split(';')[0]).join('; ');
        if (i === 0) cookieA = cookie;
        else cookieB = cookie;
      }
      const a = await db.customer.findUniqueOrThrow({
        where: { email: identities[0].email },
        include: { accounts: true },
      });
      userA = a.id;
      userB = (
        await db.customer.findUniqueOrThrow({
          where: { email: identities[1].email },
        })
      ).id;
      assert.ok(a.accounts[0].password?.startsWith('$argon2id$'));
      assert.ok(a.termsAcceptedAt);
      assert.equal(a.phone, '+919876543210');
      const duplicate = await call('/api/auth/sign-up/email/', 'POST', {
        ...identities[0],
        email: identities[0].email.toUpperCase(),
        password,
        confirmPassword: password,
        terms: true,
      });
      assert.ok(
        [400, 409, 422].includes(duplicate.status),
        'duplicate email must fail',
      );
      assert.equal(
        await db.customer.count({ where: { email: identities[0].email } }),
        1,
      );
      const session = await call(
        '/api/auth/get-session/',
        'GET',
        undefined,
        cookieA,
      );
      assert.equal(session.data.user.id, userA);
      assert.equal(JSON.stringify(session.data).includes('password'), false);
    },
  );
  await t.test(
    'invalid credentials, protected page and unauthenticated requests',
    async () => {
      const bad = await call('/api/auth/sign-in/email/', 'POST', {
        email: identities[0].email,
        password: 'InvalidPassword9!',
      });
      const unknown = await call('/api/auth/sign-in/email/', 'POST', {
        email: 'missing-' + suffix + '@example.test',
        password: 'InvalidPassword9!',
      });
      assert.equal(bad.status, 401);
      assert.equal(bad.data.error, 'Invalid email or password.');
      assert.equal(unknown.data.error, bad.data.error);
      assert.equal((await call('/api/customer/')).status, 401);
      const page = await call('/account/');
      assert.ok(
        [307, 303].includes(page.status) ||
          (page.status === 200 && page.html.includes('NEXT_REDIRECT')),
      );
      assert.ok(
        page.location?.includes('/sign-in') ||
          page.html.includes('/sign-in?returnTo'),
      );
      assert.equal(
        (
          await call(
            '/api/customer/',
            'GET',
            undefined,
            'aurelia.session_token=invalid',
          )
        ).status,
        401,
      );
      const forged = await fetch(base + '/api/customer/profile/', {
        method: 'PATCH',
        headers: {
          Origin: 'https://evil.example',
          'Content-Type': 'application/json',
          Cookie: cookieA,
        },
        body: JSON.stringify({ name: 'Test Name', phone: '9876543210' }),
      });
      assert.equal(forged.status, 403);
    },
  );
  const project = await db.project.findFirstOrThrow({
    where: { slug: 'skyline-residences' },
  });
  await t.test(
    'shortlist add, duplicate add, refresh and cross-account ownership',
    async () => {
      const add = await call(
        '/api/customer/favorites/',
        'POST',
        { projectId: project.id },
        cookieA,
      );
      assert.equal(add.status, 200);
      favorite = add.data.id;
      const again = await call(
        '/api/customer/favorites/',
        'POST',
        { projectId: project.id },
        cookieA,
      );
      assert.equal(again.data.id, favorite);
      assert.equal(
        await db.favoriteReady.count({
          where: { customerId: userA, projectId: project.id },
        }),
        1,
      );
      assert.ok(
        (
          await call('/api/customer/favorites/', 'GET', undefined, cookieA)
        ).data.some((x: { id: string }) => x.id === favorite),
      );
      for (const method of ['GET', 'DELETE'])
        assert.equal(
          (
            await call(
              '/api/customer/favorites/' + favorite + '/',
              method,
              method === 'GET' ? undefined : {},
              cookieB,
            )
          ).status,
          404,
        );
    },
  );
  await t.test(
    'saved searches validate, reopen, rename and reject IDOR',
    async () => {
      const r = await call(
        '/api/customer/saved-searches/',
        'POST',
        {
          name: 'Coastal three bedrooms',
          filters: {
            city: 'Visakhapatnam',
            bhk: 3,
            maxPrice: 12000000,
            availability: 'AVAILABLE',
            sort: 'price-asc',
          },
        },
        cookieA,
      );
      assert.equal(r.status, 200);
      saved = r.data.id;
      const opened = await call(
        '/api/customer/saved-searches/' + saved + '/',
        'GET',
        undefined,
        cookieA,
      );
      assert.ok(opened.data.url.includes('bhk=3'));
      const search = await call(
        opened.data.url.replace('/residences?', '/api/search/?'),
      );
      assert.equal(search.data.total, 2);
      assert.equal(
        (
          await call(
            '/api/customer/saved-searches/',
            'POST',
            { name: 'Invalid range', filters: { minPrice: 20, maxPrice: 10 } },
            cookieA,
          )
        ).status,
        400,
      );
      for (const method of ['GET', 'PATCH', 'DELETE'])
        assert.equal(
          (
            await call(
              '/api/customer/saved-searches/' + saved + '/',
              method,
              method === 'GET'
                ? undefined
                : method === 'PATCH'
                  ? { name: 'Forged search' }
                  : {},
              cookieB,
            )
          ).status,
          404,
        );
      assert.equal(
        (
          await call(
            '/api/customer/saved-searches/' + saved + '/',
            'PATCH',
            { name: 'My coastal collection' },
            cookieA,
          )
        ).status,
        200,
      );
    },
  );
  await t.test(
    'authenticated visit/enquiry share a lead and retain transactional idempotency',
    async () => {
      const unit = await db.unit.findFirstOrThrow({
        where: { projectId: project.id, availability: 'AVAILABLE' },
      });
      const data = {
        ...identities[0],
        projectId: project.id,
        unitId: unit.id,
        message: 'Fictional Phase Five ownership audit.',
        idempotencyKey: randomUUID(),
        preferredDate: new Date(Date.now() + 3 * 86400000)
          .toISOString()
          .slice(0, 10),
        preferredTime: '11:00',
        guestCount: 1,
      };
      const results = await Promise.all([
        call('/api/visits/', 'POST', data, cookieA),
        call('/api/visits/', 'POST', data, cookieA),
      ]);
      assert.ok(
        results.every((r) => r.status === 201),
        'idempotent visit status',
      );
      visit = results[0].data.id;
      assert.equal(results[1].data.id, visit);
      assert.match(results[0].data.reference, /^AV-[A-F0-9]{12}$/);
      assert.equal(
        await db.siteVisit.count({
          where: { idempotencyKey: data.idempotencyKey },
        }),
        1,
      );
      const enq = await call(
        '/api/enquiries/',
        'POST',
        {
          ...identities[0],
          projectId: project.id,
          message: '',
          idempotencyKey: randomUUID(),
        },
        cookieA,
      );
      assert.equal(enq.status, 201);
      enquiry = enq.data.id;
      const [v, e] = await Promise.all([
        db.siteVisit.findUniqueOrThrow({ where: { id: visit } }),
        db.enquiry.findUniqueOrThrow({ where: { id: enquiry } }),
      ]);
      assert.equal(v.customerId, userA);
      assert.equal(e.customerId, userA);
      assert.equal(v.leadId, e.leadId);
      assert.equal(v.status, 'REQUESTED');
      assert.equal(
        await db.siteVisitStatusHistory.count({ where: { siteVisitId: v.id } }),
        1,
      );
      assert.equal(
        (await call('/api/visits/', 'POST', data, cookieB)).status,
        409,
      );
      for (const [resource, id] of [
        ['visits', visit],
        ['enquiries', enquiry],
        ['profile', userA],
      ])
        assert.equal(
          (
            await call(
              '/api/customer/' + resource + '/' + id + '/',
              'GET',
              undefined,
              cookieB,
            )
          ).status,
          404,
        );
      assert.equal(
        (
          await call(
            '/api/customer/profile/' + userA + '/',
            'PATCH',
            { name: 'Forged Person', phone: '9876543210' },
            cookieB,
          )
        ).status,
        404,
      );
      const portal = await call('/api/customer/', 'GET', undefined, cookieA);
      assert.equal(portal.data.visits.length, 1);
      assert.equal(portal.data.enquiries.length, 1);
      assert.equal(
        JSON.stringify(portal.data).includes('statusHistory'),
        false,
      );
      assert.equal(JSON.stringify(portal.data).includes('payloadHash'), false);
      const beta = await call('/api/customer/', 'GET', undefined, cookieB);
      assert.equal(beta.data.visits.length, 0);
      assert.equal(beta.data.enquiries.length, 0);
      assert.equal(
        (
          await call(
            '/api/visits/',
            'POST',
            { ...data, idempotencyKey: randomUUID(), preferredTime: '03:17' },
            cookieA,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await call(
            '/api/enquiries/',
            'POST',
            {
              ...identities[0],
              projectId: project.id,
              message: '<script>',
              idempotencyKey: randomUUID(),
            },
            cookieA,
          )
        ).status,
        400,
      );
    },
  );
  await t.test(
    'profile whitelist, removal, logout invalidation, login and expiry',
    async () => {
      assert.equal(
        (
          await call(
            '/api/customer/profile/',
            'PATCH',
            {
              name: 'Updated Customer',
              phone: '9876543210',
              customerId: userB,
            },
            cookieA,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await call(
            '/api/customer/profile/',
            'PATCH',
            { name: 'Updated Customer', phone: '98765 43210' },
            cookieA,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await call(
            '/api/customer/favorites/' + favorite + '/',
            'DELETE',
            {},
            cookieA,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await call(
            '/api/customer/saved-searches/' + saved + '/',
            'DELETE',
            {},
            cookieA,
          )
        ).status,
        200,
      );
      assert.equal(
        (await call('/api/auth/sign-out/', 'POST', {}, cookieA)).status,
        200,
      );
      assert.equal(
        (await call('/api/customer/', 'GET', undefined, cookieA)).status,
        401,
      );
      const login = await call('/api/auth/sign-in/email/', 'POST', {
        email: identities[0].email.toUpperCase(),
        password,
      });
      assert.equal(login.status, 200);
      cookieA = login.cookies.map((c) => c.split(';')[0]).join('; ');
      assert.equal(
        (await call('/api/customer/', 'GET', undefined, cookieA)).status,
        200,
      );
      await db.authSession.updateMany({
        where: { userId: userA },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      assert.equal(
        (await call('/api/customer/', 'GET', undefined, cookieA)).status,
        401,
      );
      await call('/api/auth/sign-out/', 'POST', {}, cookieB);
    },
  );
});
await db.$disconnect();
