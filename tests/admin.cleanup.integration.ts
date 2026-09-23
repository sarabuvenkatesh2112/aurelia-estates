import '../scripts/database-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDb } from '../lib/db/prisma';

if (process.env.ALLOW_DB_TESTS !== 'true')
  throw Error('Explicit database test opt-in required.');
const db = getDb();
const base = process.env.TEST_BASE_URL || 'http://localhost:3002';
const qa = JSON.parse(readFileSync('.cache/phase6-qa.json', 'utf8')) as {
  password: string;
  identities: Record<string, { email: string }>;
};
const cookies: Record<string, string> = {};
async function read(path: string, role = 'SUPER_ADMIN') {
  const response = await fetch(base + path, {
    headers: { Cookie: cookies[role] || '' },
  });
  return { status: response.status, data: await response.json() };
}

await test('Final browser-fixture integrity and revocation sanity', async (t) => {
  for (const role of ['SUPER_ADMIN', 'SALES_AGENT', 'VIEWER', 'CUSTOMER']) {
    const response = await fetch(base + '/api/auth/sign-in/email/', {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: qa.identities[role].email,
        password: qa.password,
      }),
    });
    assert.equal(
      response.status,
      200,
      'Existing fictional test identity signs in',
    );
    cookies[role] = response.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
  }
  const lead = await db.lead.findFirstOrThrow({
    where: { email: 'phase6-browser-crm@example.test' },
  });
  const follow = await db.followUp.findFirstOrThrow({
    where: { leadId: lead.id, title: 'Fictional browser audit follow-up' },
  });
  await t.test(
    'browser lead, follow-up timeline and scoped DTOs persist',
    async () => {
      const detail = await read('/api/admin/leads/' + lead.id + '/');
      assert.equal(detail.status, 200);
      assert.equal(detail.data.record.budgetMin, '5000000');
      assert.equal(detail.data.record.budgetMax, '15000000');
      assert.ok(
        detail.data.followUps.some(
          (f: { id: string; displayStatus: string; lead: { name: string } }) =>
            f.id === follow.id &&
            f.displayStatus === 'COMPLETED' &&
            f.lead.name === lead.name,
        ),
      );
      const task = await read('/api/admin/follow-ups/' + follow.id + '/');
      assert.equal(task.status, 200);
      assert.equal(task.data.record.status, 'COMPLETED');
      assert.ok(
        task.data.activity.some(
          (a: { action: string }) => a.action === 'Follow-up added',
        ),
      );
      assert.ok(
        task.data.activity.some(
          (a: { action: string }) => a.action === 'Follow-up completed',
        ),
      );
      assert.equal(
        (await read('/api/admin/follow-ups/' + follow.id + '/', 'SALES_AGENT'))
          .status,
        404,
      );
      assert.equal(
        (await read('/api/admin/leads/' + lead.id + '/', 'CUSTOMER')).status,
        403,
      );
      const viewer = await read('/api/admin/leads/' + lead.id + '/', 'VIEWER');
      for (const field of ['email', 'phone', 'notes', 'password', 'token'])
        assert.equal(
          JSON.stringify(viewer.data).includes('"' + field + '"'),
          false,
        );
    },
  );
  await t.test(
    'browser visit retains original request and all schedule transitions',
    async () => {
      const filtered = await read(
        '/api/admin/visits/?q=NO-MATCH-PHASE-SIX&from=2026-09-01&to=2026-09-30',
      );
      assert.equal(filtered.status, 200);
      assert.equal(
        filtered.data.total,
        0,
        'Text search remains active together with date filters',
      );
      const visit = await db.siteVisit.findUniqueOrThrow({
        where: { reference: 'AE-P6-BROWSER-VISIT' },
        include: { statusHistory: true },
      });
      assert.equal(visit.status, 'CANCELLED');
      assert.equal(
        visit.preferredDate.toISOString().slice(0, 10),
        '2026-09-17',
      );
      for (const status of [
        'REQUESTED',
        'CONFIRMED',
        'RESCHEDULED',
        'CANCELLED',
      ])
        assert.ok(visit.statusHistory.some((h) => h.newStatus === status));
      assert.ok(
        visit.statusHistory.some(
          (h) =>
            h.newStatus === 'RESCHEDULED' && h.previousDate && h.scheduledDate,
        ),
      );
    },
  );
  await t.test(
    'public inventory, analytics and temporary access remain correct',
    async () => {
      const publicProject = {
        deletedAt: null,
        status: { not: 'ARCHIVED' as const },
      };
      assert.equal(await db.project.count({ where: publicProject }), 8);
      assert.equal(
        await db.unit.count({ where: { project: publicProject } }),
        96,
      );
      const unit = await db.unit.findFirstOrThrow({
        where: { project: { slug: 'phase6-isolated-qa-inventory' } },
        include: { priceHistory: true },
      });
      assert.ok(
        unit.priceHistory.some(
          (h) =>
            Number(h.oldPrice) === 1200000 && Number(h.newPrice) === 1250000,
        ),
      );
      const analytics = await read('/api/admin/analytics/?days=30');
      assert.equal(analytics.status, 200);
      assert.equal(
        analytics.data.inventory.reduce(
          (sum: number, v: { _count: number }) => sum + v._count,
          0,
        ),
        await db.unit.count({ where: { project: { deletedAt: null } } }),
      );
      const staff = await db.agent.findFirstOrThrow({
        where: {
          customer: { email: 'phase5-browser-1789283702224@example.test' },
        },
      });
      assert.equal(
        staff.active,
        false,
        'Temporary browser QA elevation is disabled',
      );
      assert.equal((await read('/api/admin/', 'GUEST')).status, 401);
    },
  );
}).finally(() => db.$disconnect());
