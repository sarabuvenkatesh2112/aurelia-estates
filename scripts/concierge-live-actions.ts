import './database-env.mjs';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { getDb } from '../lib/db/prisma';
if (!process.argv.includes('--allow-qa'))
  throw Error('Pass --allow-qa for the isolated fictional audit.');
const db = getDb(),
  base = 'http://localhost:3000';
const qa = JSON.parse(readFileSync('.cache/phase6-qa.json', 'utf8'));
const guest = JSON.parse(readFileSync('.cache/phase7-live-audit.json', 'utf8'));
async function call(path: string, method = 'GET', body?: unknown, cookie = '') {
  const r = await fetch(base + path, {
    method,
    headers: {
      Origin: base,
      Cookie: cookie,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  return {
    status: r.status,
    data,
    cookie: r.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; '),
  };
}
async function login(role: string) {
  const r = await call('/api/auth/sign-in/email/', 'POST', {
    email: qa.identities[role].email,
    password: qa.password,
  });
  assert.equal(r.status, 200);
  return r.cookie;
}
try {
  const cookie = await login('CUSTOMER'),
    other = await login('VIEWER');
  const user = await db.customer.findUniqueOrThrow({
    where: { email: qa.identities.CUSTOMER.email },
    select: { id: true },
  });
  const counts = {
    leads: await db.lead.count(),
    visits: await db.siteVisit.count(),
    enquiries: await db.enquiry.count(),
  };
  const path = '/api/concierge/' + guest.id + '/';
  const before = await call(path, 'GET', undefined, guest.cookie);
  assert.equal(before.status, 200);
  const message = before.data.messages.findLast(
    (m: { role: string; references?: { kind: string; filters?: unknown }[] }) =>
      m.role === 'assistant' &&
      m.references?.some((r) => r.kind === 'search_residences' && r.filters),
  );
  assert.ok(message);
  const unit = message.references.find(
    (r: { kind: string }) => r.kind === 'search_residences',
  ).facts[0];
  assert.equal((await call(path + 'claim/', 'POST', {}, other)).status, 404);
  assert.equal(
    (await call(path + 'claim/', 'POST', {}, cookie + '; ' + guest.cookie))
      .status,
    200,
  );
  assert.equal((await call(path, 'GET', undefined, guest.cookie)).status, 404);
  for (const method of ['GET', 'PATCH', 'DELETE'])
    assert.equal(
      (
        await call(
          path,
          method,
          method === 'GET'
            ? undefined
            : method === 'PATCH'
              ? { title: 'Forbidden' }
              : {},
          other,
        )
      ).status,
      404,
    );
  const favoriteBefore = await db.favoriteReady.findUnique({
    where: {
      customerId_projectId: { customerId: user.id, projectId: unit.projectId },
    },
  });
  assert.equal(
    favoriteBefore,
    null,
    'Choose a QA project with no existing favorite before add/remove testing',
  );
  const checkpoint = {
    cookie,
    id: guest.id,
    cases: [],
    cleanup: {
      customerId: user.id,
      projectId: unit.projectId,
      favoriteExisted: false,
      savedId: '',
      savedExisted: true,
    },
    counts,
  };
  writeFileSync(
    '.cache/phase7-auth-live-audit.json',
    JSON.stringify(checkpoint, null, 2),
  );
  const action = {
    messageId: message.id,
    unitId: unit.id,
    action: 'shortlist',
  };
  assert.equal(
    (await call(path + 'actions/', 'POST', action, other)).status,
    404,
  );
  assert.equal(
    (
      await call(
        path + 'actions/',
        'POST',
        { ...action, customerId: user.id },
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        path + 'actions/',
        'POST',
        { ...action, unitId: crypto.randomUUID() },
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (await call(path + 'actions/', 'POST', action, cookie)).status,
    200,
  );
  assert.equal(
    (await call(path + 'actions/', 'POST', action, cookie)).status,
    200,
  );
  assert.equal(
    await db.favoriteReady.count({
      where: { customerId: user.id, projectId: unit.projectId },
    }),
    1,
  );
  assert.equal(
    (
      await call(
        path + 'actions/',
        'POST',
        { ...action, action: 'remove_shortlist' },
        cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    await db.favoriteReady.count({
      where: { customerId: user.id, projectId: unit.projectId },
    }),
    0,
  );
  // Keep a shortlist item for the live my_collection call; cleanup restores prior membership.
  assert.equal(
    (await call(path + 'actions/', 'POST', action, cookie)).status,
    200,
  );
  const searchesBefore = await db.savedSearchReady.findMany({
    where: { customerId: user.id },
    select: { id: true },
  });
  const saved = await call(
    path + 'actions/',
    'POST',
    {
      messageId: message.id,
      action: 'save_search',
      name: 'Phase 7 Gemini verification',
    },
    cookie,
  );
  assert.equal(saved.status, 200);
  checkpoint.cleanup.savedId = saved.data.id;
  checkpoint.cleanup.savedExisted = searchesBefore.some(
    (s) => s.id === saved.data.id,
  );
  writeFileSync(
    '.cache/phase7-auth-live-audit.json',
    JSON.stringify(checkpoint, null, 2),
  );
  assert.equal(
    (
      await call(
        path + 'actions/',
        'POST',
        { messageId: message.id, action: 'save_search' },
        cookie,
      )
    ).data.id,
    saved.data.id,
  );
  const account = await call('/api/customer/', 'GET', undefined, cookie);
  assert.equal(account.status, 200);
  const reopened = account.data.searches.find(
    (s: { id: string }) => s.id === saved.data.id,
  );
  assert.ok(reopened);
  assert.ok(reopened.url.startsWith('/residences?'));
  assert.equal(
    (await fetch(base + reopened.url, { headers: { Cookie: cookie } })).status,
    200,
  );
  assert.equal(
    (
      await call(
        '/api/customer/saved-searches/' + saved.data.id + '/',
        'GET',
        undefined,
        other,
      )
    ).status,
    404,
  );
  for (const name of ['visit', 'enquiry']) {
    const r = await call(
      path + 'actions/',
      'POST',
      { ...action, action: name },
      cookie,
    );
    assert.equal(r.status, 200);
    assert.equal(r.data.unitId, unit.id);
    assert.equal(r.data.property.id, unit.projectId);
  }
  assert.deepEqual(
    {
      leads: await db.lead.count(),
      visits: await db.siteVisit.count(),
      enquiries: await db.enquiry.count(),
    },
    counts,
  );
  writeFileSync(
    '.cache/phase7-auth-live-audit.json',
    JSON.stringify(
      {
        cookie,
        id: guest.id,
        cases: [],
        cleanup: {
          customerId: user.id,
          projectId: unit.projectId,
          favoriteExisted: !!favoriteBefore,
          savedId: saved.data.id,
          savedExisted: searchesBefore.some((s) => s.id === saved.data.id),
        },
        counts,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      authenticatedClaim: true,
      foreignGuestAndAccountDenied: true,
      shortlistAddRemove: true,
      savedSearchCreateReopen: true,
      duplicateActionsIdempotent: true,
      malformedActionsRejected: true,
      visitEnquiryRequireSeparateSubmission: true,
      privateRequestsCreated: 0,
    }),
  );
} finally {
  await db.$disconnect();
}
