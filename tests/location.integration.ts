import '../scripts/database-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { getDb } from '../lib/db/prisma';
import { executeTool } from '../lib/ai/catalog';
import { projectLocation } from '../lib/location/repository';
import { searchSchema } from '../lib/validation/search';
import { searchProjects } from '../lib/repositories/projectRepository';
if (process.env.ALLOW_DB_TESTS !== 'true')
  throw Error('Explicit ALLOW_DB_TESTS=true required');
const db = getDb(),
  base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const qa = JSON.parse(readFileSync('.cache/phase6-qa.json', 'utf8'));
const cookies: Record<string, string> = {};
async function call(
  path: string,
  role = 'GUEST',
  body?: unknown,
  origin = base,
) {
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'PATCH',
    headers: {
      Cookie: cookies[role] || '',
      Origin: origin,
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
}
const publicWhere = { deletedAt: null, status: { not: 'ARCHIVED' as const } };
await test('Phase 9 Neon, public projection, location RBAC and IDOR integration', async (t) => {
  const count = await db.project.count({ where: publicWhere });
  const inventory = await db.unit.count();
  const baseline = await db.project.findFirstOrThrow({ where: publicWhere });
  let first = '',
    second = '';
  try {
    for (const role of [
      'SUPER_ADMIN',
      'ADMIN',
      'SALES_MANAGER',
      'SALES_AGENT',
      'AGENT_B',
      'VIEWER',
      'CUSTOMER',
    ]) {
      const result = await fetch(base + '/api/auth/sign-in/email/', {
        method: 'POST',
        headers: { Origin: base, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: qa.identities[role].email,
          password: qa.password,
        }),
      });
      assert.equal(result.status, 200, `${role} existing QA sign-in`);
      cookies[role] = result.headers
        .getSetCookie()
        .map((v) => v.split(';')[0])
        .join('; ');
    }
    const create = async () =>
      db.project.create({
        data: {
          slug: 'phase9-isolated-' + randomUUID(),
          name: '[ISOLATED QA] Location verification',
          shortDescription: 'Phase 9 test only',
          longDescription: 'Archived QA fixture; never public.',
          propertyType: baseline.propertyType,
          status: 'ARCHIVED',
          developerId: baseline.developerId,
          locationId: baseline.locationId,
        },
      });
    const a = await create();
    first = a.id;
    const b = await create();
    second = b.id;
    const place = await db.nearbyPlace.create({
      data: { name: '[ISOLATED QA] Shared park', category: 'PARK' },
    });
    const relation = await db.projectNearbyPlace.create({
      data: {
        projectId: a.id,
        nearbyPlaceId: place.id,
        distanceKm: 7,
        isIllustrative: true,
      },
    });
    const other = await db.projectNearbyPlace.create({
      data: {
        projectId: b.id,
        nearbyPlaceId: place.id,
        distanceKm: 8,
        isIllustrative: true,
      },
    });
    const path = `/api/admin/locations/${a.slug}/`;
    const original = (await call(path, 'ADMIN')).data.edit;
    await t.test(
      'Five roles, customer/guest, spoofing and cross-project nearby IDs',
      async () => {
        assert.equal((await call(path)).status, 401);
        for (const role of [
          'CUSTOMER',
          'VIEWER',
          'SALES_AGENT',
          'AGENT_B',
          'SALES_MANAGER',
        ]) {
          assert.equal((await call(path, role)).status, 403);
          assert.equal((await call(path, role, original)).status, 403);
        }
        assert.equal((await call(path, 'SUPER_ADMIN')).status, 200);
        assert.equal(
          (await call(path, 'ADMIN', original, 'https://not-aurelia.example'))
            .status,
          403,
        );
        assert.equal(
          (await call(path, 'ADMIN', { ...original, role: 'SUPER_ADMIN' }))
            .status,
          400,
        );
        assert.equal(
          (
            await call(path, 'ADMIN', {
              ...original,
              coordinates: { lat: 91, lng: 3 },
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await call(path, 'ADMIN', {
              ...original,
              nearby: [{ ...original.nearby[0], id: other.id }],
            })
          ).status,
          404,
        );
      },
    );
    await t.test(
      'Concurrent edits, shared landmarks, meaningful append-only audit and unchanged saves',
      async () => {
        const changed = {
          ...original,
          narrative: 'QA editorial context',
          nearby: [
            { ...original.nearby[0], name: '[ISOLATED QA] Updated park' },
          ],
        };
        const results = await Promise.all([
          call(path, 'ADMIN', changed),
          call(path, 'ADMIN', changed),
        ]);
        assert.deepEqual(
          results.map((r) => r.status).sort((a, b) => a - b),
          [200, 409],
        );
        const untouched = await db.projectNearbyPlace.findUniqueOrThrow({
          where: { id: other.id },
          include: { nearbyPlace: true },
        });
        assert.equal(untouched.nearbyPlace.name, '[ISOLATED QA] Shared park');
        assert.equal(Number(untouched.distanceKm), 8);
        const updated = await db.projectNearbyPlace.findUniqueOrThrow({
          where: { id: relation.id },
        });
        assert.notEqual(updated.nearbyPlaceId, place.id);
        const audit = await db.auditLogReady.findFirstOrThrow({
          where: { entityId: a.id, action: 'Project location updated' },
        });
        assert.ok(JSON.stringify(audit.metadata).includes('nearbyChanges'));
        await assert.rejects(
          db.auditLogReady.update({
            where: { id: audit.id },
            data: { action: 'tampered' },
          }),
        );
        const fresh = (await call(path, 'ADMIN')).data.edit;
        assert.equal((await call(path, 'ADMIN', fresh)).data.unchanged, true);
        assert.equal(
          await db.auditLogReady.count({ where: { entityId: a.id } }),
          1,
        );
        writeFileSync(
          '.cache/phase9-fixture.json',
          JSON.stringify({ slug: a.slug, id: a.id }),
        );
      },
    );
    await t.test(
      'Public location and Gemini use Neon facts; archived IDs and invented facts excluded',
      async () => {
        const location = await projectLocation(baseline.slug);
        assert.ok(location);
        assert.equal(location.name, baseline.name);
        assert.equal(location.verified, false);
        assert.equal(location.directionsUrl, null);
        assert.ok(
          location.nearby.every(
            (n) =>
              n.illustrative && n.distanceKm === null && n.minutes === null,
          ),
        );
        assert.equal(await projectLocation(a.slug), null);
        assert.equal(
          (await call(`/api/projects/${a.slug}/location/`)).status,
          404,
        );
        const tool = await executeTool(
          'location_context',
          { slugs: [baseline.slug, a.slug], category: null },
          new Headers(),
          null,
        );
        const text = JSON.stringify(tool);
        assert.ok(text.includes(baseline.name));
        assert.ok(!text.includes(a.slug));
        assert.ok(
          !/customerId|agentId|password|DATABASE_URL|GEMINI_API_KEY/.test(text),
        );
        await assert.rejects(
          executeTool(
            'location_context',
            { slugs: ['https://evil.example'], category: null },
            new Headers(),
            null,
          ),
        );
        if (location.nearby[0]) {
          const response = await call(
            `/api/projects/${baseline.slug}/location/route-estimate/?nearby=${location.nearby[0].id}`,
          );
          assert.equal(response.data.reason, 'unverified-location');
          assert.equal(
            (
              await call(
                `/api/projects/${baseline.slug}/location/route-estimate/?nearby=${other.id}`,
              )
            ).status,
            404,
          );
        }
        const search = await searchProjects(
          searchSchema.parse({
            city: location.city,
            locality: location.locality,
          }),
        );
        assert.ok(search.rows.some((r) => r.project.slug === baseline.slug));
        assert.ok(
          search.rows.every((r) => r.project.location.city === location.city),
        );
      },
    );
    await t.test(
      'QA isolation, public inventory and visit statuses remain intact',
      async () => {
        assert.equal(await db.project.count({ where: publicWhere }), count);
        assert.equal(await db.unit.count(), inventory);
        assert.equal(
          await db.siteVisit.count({
            where: { projectId: { in: [a.id, b.id] } },
          }),
          0,
        );
        assert.equal(
          await db.project.count({
            where: { id: { in: [a.id, b.id] }, status: 'ARCHIVED' },
          }),
          2,
        );
      },
    );
  } finally {
    // Preserve audit provenance, keep only archived fixtures; no account permissions are changed.
    if (first || second)
      await db.project.updateMany({
        where: { id: { in: [first, second].filter(Boolean) } },
        data: { status: 'ARCHIVED' },
      });
    for (const cookie of Object.values(cookies))
      await fetch(base + '/api/auth/sign-out/', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: base,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
    await db.$disconnect();
  }
});
