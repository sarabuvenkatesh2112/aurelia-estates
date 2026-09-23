import '../scripts/database-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { hash } from '@node-rs/argon2';
import { getDb } from '../lib/db/prisma';
import { staffRoles, type StaffRole } from '../lib/admin/policy';
if (process.env.ALLOW_DB_TESTS !== 'true')
  throw Error('Explicit ALLOW_DB_TESTS=true is required.');
const db = getDb(),
  base = process.env.TEST_BASE_URL || 'http://localhost:3002',
  suffix = randomUUID();
const password = 'Qa!A9' + randomBytes(24).toString('base64url');
type Identity = { id: string; agentId?: string; cookie: string; email: string };
const identities: Record<string, Identity> = {};
async function call(
  path: string,
  who = 'SUPER_ADMIN',
  method = 'GET',
  body?: unknown,
) {
  const r = await fetch(base + path, {
    method,
    redirect: 'manual',
    headers: {
      Origin: base,
      Cookie: identities[who]?.cookie || '',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = r.headers.get('content-type')?.includes('json')
    ? await r.json()
    : null;
  return {
    status: r.status,
    data,
    location: r.headers.get('location'),
    cookies: r.headers.getSetCookie(),
    html: data === null ? await r.text() : '',
  };
}
async function fresh(resource: string, id: string) {
  const r = await call('/api/admin/' + resource + '/' + id + '/');
  assert.equal(r.status, 200);
  return r.data.record;
}
async function patch(
  resource: string,
  id: string,
  body: Record<string, unknown>,
  who = 'SUPER_ADMIN',
) {
  const r = await fresh(resource, id);
  return call('/api/admin/' + resource + '/' + id + '/', who, 'PATCH', {
    version: r.version,
    ...body,
  });
}
void test('Phase 6 real database and direct-API operational security', async (t) => {
  const originalUnits = await db.unit.count(),
    originalProjects = await db.project.count();
  const originalIds = (await db.unit.findMany({ select: { id: true } })).map(
    (v) => v.id,
  );
  const encoded = await hash(password, {
    algorithm: 2,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  for (const role of [...staffRoles, 'AGENT_B', 'CUSTOMER']) {
    const id = randomUUID(),
      email = 'phase6-' + role.toLowerCase() + '-' + suffix + '@example.test';
    await db.customer.create({
      data: {
        id,
        name: 'Fictional ' + role.toLowerCase().replace(/_/g, ' '),
        email,
        phone: '+919876543210',
        termsAcceptedAt: new Date(),
        accounts: {
          create: {
            accountId: id,
            providerId: 'credential',
            password: encoded,
          },
        },
      },
    });
    const agent =
      role === 'CUSTOMER'
        ? null
        : await db.agent.create({
            data: {
              customerId: id,
              name: 'Fictional ' + role.replace(/_/g, ' '),
              email,
              role: role === 'AGENT_B' ? 'SALES_AGENT' : (role as StaffRole),
            },
          });
    identities[role] = { id, email, cookie: '', agentId: agent?.id };
    const login = await call('/api/auth/sign-in/email/', role, 'POST', {
      email,
      password,
    });
    assert.equal(
      login.status,
      200,
      'QA sign-in succeeds without exposing its credentials',
    );
    identities[role].cookie = login.cookies
      .map((v: string) => v.split(';')[0])
      .join('; ');
  }
  writeFileSync(
    '.cache/phase6-qa.json',
    JSON.stringify({
      identities: Object.fromEntries(
        Object.entries(identities).map(([k, v]) => [
          k,
          { id: v.id, email: v.email, agentId: v.agentId },
        ]),
      ),
      password,
    }),
    { mode: 0o600 },
  );
  const project = await db.project.findFirstOrThrow({
      where: { deletedAt: null },
      select: { id: true },
    }),
    source = await db.leadSource.findFirstOrThrow({
      where: { code: 'DIRECT' },
    });
  let leadId = '',
    visitId = '',
    enquiryId = '',
    unitId = '';
  await t.test(
    'all five staff roles, guest/customer denial, invalid IDs and viewer redaction',
    async () => {
      assert.equal((await call('/api/admin/', 'GUEST')).status, 401);
      assert.equal((await call('/api/admin/', 'CUSTOMER')).status, 403);
      const guestPage = await call('/admin/', 'GUEST');
      assert.ok(
        guestPage.location?.includes('/admin/sign-in') ||
          (guestPage.status === 200 &&
            guestPage.html.includes('/admin/sign-in')),
      );
      for (const role of staffRoles)
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
      assert.equal((await call('/api/admin/leads/not-an-id/')).status, 400);
      assert.equal((await call('/api/admin/leads/?page=0')).status, 400);
      assert.equal(
        (await call('/api/admin/leads/?status=INJECTED')).status,
        400,
      );
      const viewer = await call('/api/admin/leads/', 'VIEWER');
      assert.equal(JSON.stringify(viewer.data).includes('"email"'), false);
      assert.equal(JSON.stringify(viewer.data).includes('"phone"'), false);
      assert.equal(
        (await call('/api/admin/leads/', 'VIEWER', 'POST', {})).status,
        403,
      );
    },
  );
  await t.test(
    'lead creation, assignment, agent IDOR, notes, follow-ups and conflict/history',
    async () => {
      const created = await call('/api/admin/leads/', 'ADMIN', 'POST', {
        name: 'Fictional CRM Customer',
        email: identities.CUSTOMER.email,
        phone: '9876543210',
        projectId: project.id,
        sourceId: source.id,
        customerId: identities.CUSTOMER.id,
        budgetMin: 1000000,
        budgetMax: 2000000,
      });
      assert.equal(created.status, 200);
      leadId = created.data.id;
      assert.equal(
        (
          await patch(
            'leads',
            leadId,
            { agentId: identities.SALES_AGENT.agentId },
            'SALES_MANAGER',
          )
        ).status,
        200,
      );
      assert.equal(
        (await call('/api/admin/leads/' + leadId + '/', 'SALES_AGENT')).status,
        200,
      );
      assert.equal(
        (await call('/api/admin/leads/' + leadId + '/', 'AGENT_B')).status,
        404,
      );
      assert.equal(
        (
          await call(
            '/api/admin/customers/' + identities.CUSTOMER.id + '/',
            'AGENT_B',
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await patch(
            'leads',
            leadId,
            { agentId: identities.AGENT_B.agentId },
            'SALES_AGENT',
          )
        ).status,
        403,
      );
      assert.equal(
        (await patch('leads', leadId, { status: 'WON' }, 'SALES_AGENT')).status,
        409,
      );
      assert.equal(
        (
          await patch(
            'leads',
            leadId,
            { status: 'CONTACTED', priority: 'HIGH' },
            'SALES_AGENT',
          )
        ).status,
        200,
      );
      const note = await call('/api/admin/notes/', 'SALES_AGENT', 'POST', {
        leadId,
        text: 'Private staff note must never reach a customer.',
      });
      assert.equal(note.status, 200);
      const follow = await call(
        '/api/admin/follow-ups/',
        'SALES_AGENT',
        'POST',
        {
          leadId,
          agentId: identities.SALES_AGENT.agentId,
          title: 'Fictional follow-up',
          dueAt: new Date(Date.now() - 3600000).toISOString(),
        },
      );
      assert.equal(follow.status, 200);
      const list = await call(
        '/api/admin/follow-ups/?followUp=overdue',
        'SALES_AGENT',
      );
      assert.ok(
        list.data.items.some(
          (f: { id: string; displayStatus: string }) =>
            f.id === follow.data.id && f.displayStatus === 'OVERDUE',
        ),
      );
      assert.equal(
        (
          await patch(
            'leads',
            leadId,
            { agentId: identities.AGENT_B.agentId },
            'SALES_MANAGER',
          )
        ).status,
        200,
      );
      assert.equal(
        (await call('/api/admin/leads/' + leadId + '/', 'SALES_AGENT')).status,
        404,
      );
      assert.equal(
        (
          await call(
            '/api/admin/follow-ups/' + follow.data.id + '/',
            'SALES_AGENT',
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await patch(
            'follow-ups',
            follow.data.id,
            { status: 'COMPLETED' },
            'AGENT_B',
          )
        ).status,
        200,
      );
      const current = await fresh('leads', leadId);
      const changes = await Promise.all([
        call('/api/admin/leads/' + leadId + '/', 'ADMIN', 'PATCH', {
          version: current.version,
          status: 'QUALIFIED',
        }),
        call('/api/admin/leads/' + leadId + '/', 'SALES_MANAGER', 'PATCH', {
          version: current.version,
          priority: 'URGENT',
        }),
      ]);
      assert.equal(changes.filter((v) => v.status === 200).length, 1);
      assert.equal(changes.filter((v) => v.status === 409).length, 1);
      await patch('leads', leadId, { status: 'QUALIFIED' });
      await patch('leads', leadId, { status: 'NEGOTIATION' });
      assert.equal(
        (await patch('leads', leadId, { status: 'WON' })).status,
        200,
      );
      const history = await db.leadStatusHistory.count({ where: { leadId } });
      assert.ok(history >= 5);
      assert.ok(
        (await db.auditLogReady.count({
          where: { entityType: 'lead', entityId: leadId },
        })) >= 7,
      );
    },
  );
  await t.test(
    'website enquiries/visits reach CRM and preserve private ownership and original data',
    async () => {
      const body = {
        idempotencyKey: randomUUID(),
        projectId: project.id,
        name: 'Fictional CRM Customer',
        email: identities.CUSTOMER.email,
        phone: '9876543210',
        message: 'Fictional original customer request.',
      };
      const enquiry = await call('/api/enquiries/', 'CUSTOMER', 'POST', body);
      assert.equal(enquiry.status, 201);
      enquiryId = enquiry.data.id;
      const date = new Date(Date.now() + 3 * 86400000)
        .toISOString()
        .slice(0, 10);
      const visit = await call('/api/visits/', 'CUSTOMER', 'POST', {
        ...body,
        idempotencyKey: randomUUID(),
        preferredDate: date,
        preferredTime: '14:00',
        guestCount: 2,
      });
      assert.equal(visit.status, 201);
      visitId = visit.data.id;
      const lead = await db.siteVisit.findUniqueOrThrow({
        where: { id: visitId },
        select: { leadId: true },
      });
      assert.equal(lead.leadId, leadId);
      assert.equal(
        (await call('/api/admin/visits/' + visitId + '/', 'SALES_AGENT'))
          .status,
        404,
      );
      assert.equal(
        (
          await patch(
            'enquiries',
            enquiryId,
            { status: 'IN_REVIEW' },
            'AGENT_B',
          )
        ).status,
        200,
      );
      assert.equal(
        (await patch('enquiries', enquiryId, { status: 'CLOSED' }, 'AGENT_B'))
          .status,
        200,
      );
      assert.equal(
        (await patch('visits', visitId, { status: 'COMPLETED' }, 'AGENT_B'))
          .status,
        409,
      );
      assert.equal(
        (
          await patch(
            'visits',
            visitId,
            {
              status: 'CONFIRMED',
              scheduledDate: date,
              scheduledTime: '15:00',
            },
            'AGENT_B',
          )
        ).status,
        200,
      );
      const later = new Date(Date.now() + 4 * 86400000)
        .toISOString()
        .slice(0, 10);
      assert.equal(
        (
          await patch(
            'visits',
            visitId,
            {
              status: 'RESCHEDULED',
              scheduledDate: later,
              scheduledTime: '16:00',
            },
            'AGENT_B',
          )
        ).status,
        200,
      );
      assert.equal(
        (await patch('visits', visitId, { status: 'NO_SHOW' }, 'AGENT_B'))
          .status,
        400,
      );
      const own = await call(
        '/api/customer/visits/' + visitId + '/',
        'CUSTOMER',
      );
      assert.equal(own.data.preferredTime, '16:00');
      assert.equal(own.data.status, 'RESCHEDULED');
      assert.equal(JSON.stringify(own.data).includes('Private staff'), false);
      assert.equal(
        (await call('/api/customer/visits/' + visitId + '/', 'AGENT_B')).status,
        404,
      );
      const stored = await db.siteVisit.findUniqueOrThrow({
        where: { id: visitId },
      });
      assert.equal(stored.preferredTime, '14:00');
      assert.equal(stored.preferredDate.toISOString().slice(0, 10), date);
      assert.equal(
        (
          await patch(
            'visits',
            visitId,
            { status: 'CANCELLED', note: 'Private cancellation context.' },
            'AGENT_B',
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await patch(
            'visits',
            visitId,
            {
              status: 'CONFIRMED',
              scheduledDate: date,
              scheduledTime: '14:00',
            },
            'AGENT_B',
          )
        ).status,
        409,
      );
      assert.equal(
        await db.siteVisitStatusHistory.count({
          where: { siteVisitId: visitId },
        }),
        4,
      );
      // Past scheduled fixtures exercise completion/no-show without changing original visits.
      for (const outcome of ['COMPLETED', 'NO_SHOW']) {
        const past = await db.siteVisit.create({
          data: {
            idempotencyKey: randomUUID(),
            payloadHash: 'phase6-fictional-fixture',
            reference: 'QA-' + randomUUID(),
            leadId,
            customerId: identities.CUSTOMER.id,
            projectId: project.id,
            name: 'Fictional Past Visit',
            email: identities.CUSTOMER.email,
            phone: '+919876543210',
            preferredDate: new Date('2026-01-01'),
            preferredTime: '10:00',
            scheduledDate: new Date('2026-01-01'),
            scheduledTime: '10:00',
            status: 'CONFIRMED',
          },
        });
        assert.equal(
          (await patch('visits', past.id, { status: outcome }, 'AGENT_B'))
            .status,
          200,
        );
      }
    },
  );
  await t.test(
    'isolated inventory status/price history, hierarchy and role restrictions',
    async () => {
      const template = await db.unit.findFirstOrThrow({
        where: { projectId: project.id },
        include: { project: true, unitType: true },
      });
      const isolated = await db.project.upsert({
        where: { slug: 'phase6-isolated-qa-inventory' },
        update: {},
        create: {
          name: 'Phase Six QA Inventory - Archived',
          slug: 'phase6-isolated-qa-inventory',
          shortDescription: 'Isolated test inventory.',
          longDescription: 'Not part of the public collection.',
          propertyType: template.project.propertyType,
          status: 'ARCHIVED',
          developerId: template.project.developerId,
          locationId: template.project.locationId,
        },
      });
      const qaTower = await db.tower.upsert({
        where: { projectId_code: { projectId: isolated.id, code: 'QA' } },
        update: {},
        create: {
          projectId: isolated.id,
          name: 'QA Tower',
          code: 'QA',
          totalFloors: 1,
          description: 'Isolated QA hierarchy',
        },
      });
      const qaFloor = await db.floor.upsert({
        where: { towerId_floorNumber: { towerId: qaTower.id, floorNumber: 0 } },
        update: {},
        create: { towerId: qaTower.id, floorNumber: 0, label: 'QA Ground' },
      });
      const qaType = await db.unitType.upsert({
        where: {
          projectId_name: { projectId: isolated.id, name: 'QA Configuration' },
        },
        update: {},
        create: {
          projectId: isolated.id,
          name: 'QA Configuration',
          bedrooms: template.unitType.bedrooms,
          bathrooms: template.unitType.bathrooms,
          balconies: template.unitType.balconies,
          minArea: template.unitType.minArea,
          maxArea: template.unitType.maxArea,
          description: 'Isolated QA configuration',
        },
      });
      const unit = await db.unit.create({
        data: {
          projectId: isolated.id,
          towerId: qaTower.id,
          floorId: qaFloor.id,
          unitTypeId: qaType.id,
          unitNumber: 'QA-' + suffix,
          orientation: template.orientation,
          builtUpAreaSqft: template.builtUpAreaSqft,
          carpetAreaSqft: template.carpetAreaSqft,
          basePrice: 1_000_000,
          currentPrice: 1_000_000,
          availability: 'NOT_RELEASED',
        },
      });
      unitId = unit.id;
      assert.equal(
        (
          await patch(
            'inventory',
            unit.id,
            {
              projectId: isolated.id,
              currentPrice: 1200000,
              reason: 'QA price change',
            },
            'SALES_MANAGER',
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await patch('inventory', unit.id, {
            projectId: randomUUID(),
            availability: 'AVAILABLE',
            reason: 'QA hierarchy test',
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await patch(
            'inventory',
            unit.id,
            {
              projectId: isolated.id,
              availability: 'AVAILABLE',
              currentPrice: 1200000,
              reason: 'QA price change',
            },
            'ADMIN',
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await patch(
            'inventory',
            unit.id,
            {
              projectId: isolated.id,
              availability: 'SOLD',
              reason: 'Invalid direct sale',
            },
            'ADMIN',
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await patch(
            'inventory',
            unit.id,
            {
              projectId: isolated.id,
              availability: 'RESERVED',
              reason: 'QA reservation',
            },
            'ADMIN',
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await patch(
            'inventory',
            unit.id,
            {
              projectId: isolated.id,
              availability: 'SOLD',
              reason: 'QA completed lifecycle',
            },
            'ADMIN',
          )
        ).status,
        200,
      );
      assert.equal(
        await db.unitPriceHistory.count({ where: { unitId: unit.id } }),
        1,
      );
      assert.equal(
        await db.unitStatusHistory.count({ where: { unitId: unit.id } }),
        3,
      );
      assert.equal(
        await db.unit.count({ where: { id: { in: originalIds } } }),
        originalUnits,
      );
      assert.ok((await db.project.count()) >= originalProjects);
      const filtered = await call(
        '/api/admin/inventory/?projectId=' +
          isolated.id +
          '&q=' +
          encodeURIComponent('QA-' + suffix),
      );
      assert.equal(filtered.data.total, 1);
    },
  );
  await t.test(
    'staff escalation, inactive access, append-only audit and analytics integrity',
    async () => {
      assert.equal(
        (
          await patch('staff', identities.SUPER_ADMIN.agentId!, {
            role: 'VIEWER',
            active: true,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await patch(
            'staff',
            identities.SALES_AGENT.agentId!,
            { role: 'SUPER_ADMIN', active: true },
            'SALES_AGENT',
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await patch('staff', identities.VIEWER.agentId!, {
            role: 'VIEWER',
            active: false,
          })
        ).status,
        200,
      );
      assert.equal((await call('/api/admin/leads/', 'VIEWER')).status, 403);
      assert.equal(
        (
          await patch('staff', identities.VIEWER.agentId!, {
            role: 'VIEWER',
            active: true,
          })
        ).status,
        200,
      );
      const audit = await db.auditLogReady.findFirstOrThrow({
        where: { entityId: leadId },
      });
      await assert.rejects(
        db.auditLogReady.update({
          where: { id: audit.id },
          data: { action: 'overwrite forbidden' },
        }),
      );
      const analytics = await call('/api/admin/analytics/?days=30', 'ADMIN');
      assert.equal(analytics.status, 200);
      assert.equal(
        analytics.data.inventory.reduce(
          (n: number, v: { _count: number }) => n + v._count,
          0,
        ),
        await db.unit.count({ where: { project: { deletedAt: null } } }),
      );
      const since = new Date(analytics.data.since),
        until = new Date(analytics.data.until);
      assert.equal(
        analytics.data.cohortTotal,
        await db.lead.count({
          where: { deletedAt: null, createdAt: { gte: since, lte: until } },
        }),
      );
      const zero = await call(
        '/api/admin/analytics/?from=2000-01-01&to=2000-01-07',
      );
      assert.equal(zero.data.cohortTotal, 0);
      assert.equal(zero.data.leadToVisit, 0);
      const csrf = await fetch(base + '/api/admin/leads/' + leadId + '/', {
        method: 'PATCH',
        headers: {
          Cookie: identities.SUPER_ADMIN.cookie,
          Origin: 'https://untrusted.example',
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      assert.equal(csrf.status, 403);
      assert.equal(
        (
          await patch('leads', leadId, {
            customerId: identities.SUPER_ADMIN.id,
          })
        ).status,
        400,
      );
      const safe = await call('/api/customer/', 'CUSTOMER');
      assert.equal(
        JSON.stringify(safe.data).includes('Private staff note'),
        false,
      );
      assert.equal(JSON.stringify(safe.data).includes('password'), false);
    },
  );
  writeFileSync(
    '.cache/phase6-test-records.json',
    JSON.stringify({
      leadId,
      visitId,
      enquiryId,
      unitId,
      originalUnits,
      originalProjects,
    }),
  );
}).finally(() => db.$disconnect());
