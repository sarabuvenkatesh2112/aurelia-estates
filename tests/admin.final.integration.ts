import '../scripts/database-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { getDb } from '../lib/db/prisma';
if (process.env.ALLOW_DB_TESTS !== 'true')
  throw Error('Explicit ALLOW_DB_TESTS=true is required.');
const db = getDb(),
  base = process.env.TEST_BASE_URL || 'http://localhost:3002';
const qa = JSON.parse(readFileSync('.cache/phase6-qa.json', 'utf8')) as {
  password: string;
  identities: Record<string, { id: string; email: string; agentId?: string }>;
};
const fixtures = JSON.parse(
  readFileSync('.cache/phase6-test-records.json', 'utf8'),
) as { leadId: string; visitId: string; enquiryId: string; unitId: string };
const cookies: Record<string, string> = {};
async function call(
  path: string,
  role = 'SUPER_ADMIN',
  method = 'GET',
  body?: unknown,
) {
  const r = await fetch(base + path, {
    method,
    redirect: 'manual',
    headers: {
      Origin: base,
      Cookie: cookies[role] || '',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = r.headers.get('content-type')?.includes('json');
  return {
    status: r.status,
    data: json ? await r.json() : null,
    html: json ? '' : await r.text(),
    location: r.headers.get('location'),
    setCookies: r.headers.getSetCookie(),
  };
}
await test('Remaining Phase 6 role and QA isolation verification', async (t) => {
  for (const [role, user] of Object.entries(qa.identities)) {
    const r = await call('/api/auth/sign-in/email/', role, 'POST', {
      email: user.email,
      password: qa.password,
    });
    assert.equal(r.status, 200, 'Existing QA identity signs in');
    cookies[role] = r.setCookies.map((c) => c.split(';')[0]).join('; ');
  }
  await t.test(
    'staff roles, streamed guest redirect and safe viewer DTOs',
    async () => {
      assert.equal((await call('/api/admin/', 'GUEST')).status, 401);
      assert.equal((await call('/api/admin/', 'CUSTOMER')).status, 403);
      const guest = await call('/admin/', 'GUEST');
      assert.ok(
        guest.location?.includes('/admin/sign-in') ||
          (guest.status === 200 && guest.html.includes('/admin/sign-in')),
      );
      assert.equal(guest.html.includes('Relationships, considered'), false);
      for (const role of [
        'SUPER_ADMIN',
        'ADMIN',
        'SALES_MANAGER',
        'SALES_AGENT',
        'VIEWER',
      ])
        assert.equal((await call('/api/admin/leads/', role)).status, 200);
      assert.equal((await call('/api/admin/staff/', 'ADMIN')).status, 403);
      assert.equal(
        (await call('/api/admin/audit/', 'SALES_MANAGER')).status,
        403,
      );
      assert.equal(
        (await call('/api/admin/analytics/', 'SALES_AGENT')).status,
        403,
      );
      const viewer = await call('/api/admin/leads/', 'VIEWER');
      for (const field of ['email', 'phone', 'leadNotes', 'password', 'token'])
        assert.equal(
          JSON.stringify(viewer.data).includes('"' + field + '"'),
          false,
        );
      for (const route of ['leads', 'visits', 'inventory', 'staff'])
        assert.equal(
          (await call('/api/admin/' + route + '/', 'VIEWER', 'POST', {}))
            .status,
          403,
        );
      assert.equal((await call('/api/admin/leads/not-an-id/')).status, 400);
      assert.equal((await call('/api/admin/leads/?page=0')).status, 400);
      assert.equal(
        (await call('/api/admin/leads/?status=INJECTED')).status,
        400,
      );
    },
  );
  await t.test(
    'cross-agent IDs, role spoofing, customer-owned saved searches and safe visit projection',
    async () => {
      assert.equal(
        (await call('/api/admin/leads/' + fixtures.leadId + '/', 'AGENT_B'))
          .status,
        200,
      );
      for (const [resource, id] of [
        ['leads', fixtures.leadId],
        ['visits', fixtures.visitId],
        ['enquiries', fixtures.enquiryId],
        ['customers', qa.identities.CUSTOMER.id],
      ])
        assert.equal(
          (await call('/api/admin/' + resource + '/' + id + '/', 'SALES_AGENT'))
            .status,
          404,
        );
      assert.equal(
        (await call('/api/admin/leads/' + fixtures.leadId + '/', 'CUSTOMER'))
          .status,
        403,
      );
      assert.equal(
        (
          await call(
            '/api/admin/staff/' + qa.identities.SALES_AGENT.agentId + '/',
            'SALES_AGENT',
            'PATCH',
            { version: 0, role: 'SUPER_ADMIN', active: true },
          )
        ).status,
        403,
      );
      assert.equal(
        (await call('/api/admin/leads/?role=SUPER_ADMIN', 'SALES_AGENT'))
          .status,
        400,
      );
      const save = await call(
        '/api/customer/saved-searches/',
        'CUSTOMER',
        'POST',
        { name: 'Phase Six ownership check', filters: { city: 'Goa' } },
      );
      assert.equal(save.status, 200);
      const searchId = save.data.id;
      assert.ok(searchId);
      assert.equal(
        (
          await call(
            '/api/customer/saved-searches/' + searchId + '/',
            'AGENT_B',
          )
        ).status,
        404,
      );
      const own = await call(
        '/api/customer/visits/' + fixtures.visitId + '/',
        'CUSTOMER',
      );
      assert.equal(own.status, 200);
      assert.equal(own.data.status, 'CANCELLED');
      assert.equal(
        JSON.stringify(own.data).includes('Private cancellation context'),
        false,
      );
      assert.equal(
        (
          await call(
            '/api/customer/visits/' + fixtures.visitId + '/',
            'AGENT_B',
          )
        ).status,
        404,
      );
      assert.equal(
        (await call('/api/admin/inventory/' + randomUUID() + '/', 'ADMIN'))
          .status,
        404,
      );
    },
  );
  await t.test(
    'QA inventory is archived without losing original inventory or histories',
    async () => {
      const qaUnit = await db.unit.findUniqueOrThrow({
        where: { id: fixtures.unitId },
        include: { project: true, tower: true, floor: true, unitType: true },
      });
      assert.equal(qaUnit.project.status, 'ARCHIVED');
      assert.equal(qaUnit.tower.projectId, qaUnit.projectId);
      assert.equal(qaUnit.floor.towerId, qaUnit.towerId);
      assert.equal(qaUnit.unitType.projectId, qaUnit.projectId);
      assert.equal(
        await db.unit.count({
          where: { project: { deletedAt: null, status: { not: 'ARCHIVED' } } },
        }),
        96,
      );
      assert.equal(
        await db.project.count({
          where: { deletedAt: null, status: { not: 'ARCHIVED' } },
        }),
        8,
      );
      assert.ok(
        (await db.unitPriceHistory.count({
          where: { unitId: fixtures.unitId },
        })) >= 1,
        'Original price history remains after additional browser QA edits',
      );
      assert.equal(
        await db.unitStatusHistory.count({
          where: { unitId: fixtures.unitId },
        }),
        3,
      );
      const publicSearch = await call(
        '/api/search/?keyword=QA-' + fixtures.unitId,
      );
      assert.equal(publicSearch.status, 200);
      const detail = await call('/residences/' + qaUnit.project.slug + '/');
      assert.ok(
        detail.status === 404 ||
          detail.html.includes('NEXT_HTTP_ERROR_FALLBACK;404'),
      );
      const audit = await db.auditLogReady.findFirstOrThrow({
        where: { entityId: fixtures.unitId },
      });
      await assert.rejects(
        db.auditLogReady.update({
          where: { id: audit.id },
          data: { metadata: { test: 'must fail' } },
        }),
      );
    },
  );
}).finally(() => db.$disconnect());
