import '../scripts/database-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getDb } from '../lib/db/prisma';
import { getFacets } from '../lib/repositories/projectRepository';
if (process.env.ALLOW_DB_TESTS !== 'true')
  throw new Error(
    'Set ALLOW_DB_TESTS=true for this explicit fictional-data integration run.',
  );
const db = getDb(),
  base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const get = async (path: string) => {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 200);
  return response.json();
};
const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify(body),
  });
await test('Neon migration and relational inventory are present', async () => {
  const publicProjects = await db.project.count({
    where: { deletedAt: null, status: { not: 'ARCHIVED' } },
  });
  assert.ok(publicProjects >= 8);
  assert.ok(
    (await db.unit.count({
      where: { project: { deletedAt: null, status: { not: 'ARCHIVED' } } },
    })) >= 96,
  );
  assert.ok((await db.tower.count()) >= 16);
  assert.ok((await db.amenity.count()) >= 20);
  assert.ok((await db.unitPriceHistory.count()) >= 96);
  const migrations = await db.$queryRaw<
    { n: bigint }[]
  >`SELECT count(*) AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL`;
  assert.ok(Number(migrations[0].n) >= 3);
});
await test('archived QA inventory is excluded from public filter facets', async () => {
  const facets = await getFacets();
  const active = await db.unitType.findMany({
    where: { project: { deletedAt: null, status: { not: 'ARCHIVED' } } },
    select: { bedrooms: true, projectId: true },
    distinct: ['bedrooms', 'projectId'],
  });
  const expected = new Map<number, number>();
  for (const configuration of active)
    expected.set(
      Number(configuration.bedrooms),
      (expected.get(Number(configuration.bedrooms)) || 0) + 1,
    );
  assert.deepEqual(
    facets.bedrooms,
    [...expected]
      .sort((a, b) => a[0] - b[0])
      .map(([value, count]) => ({ value, count })),
  );
  const isolated = await db.unitType.findMany({
    where: { project: { slug: 'phase6-isolated-qa-inventory' } },
  });
  assert.ok(isolated.length > 0, 'The excluded archived fixture is present');
});
await test('database search composes price, bedrooms and availability on the same unit', async () => {
  const data = await get(
    '/api/search/?city=visakhapatnam&bhk=3&maxPrice=12000000&availability=AVAILABLE',
  );
  assert.equal(data.total, 2);
  assert.deepEqual(
    data.properties.map((p: { name: string }) => p.name),
    ['Skyline Residences', 'The Eastern Grove'],
  );
  for (const p of data.properties) assert.ok(p.price <= 1.2);
  const empty = await get('/api/search/?city=Goa&type=APARTMENT');
  assert.equal(empty.total, 0);
  const invalid = await fetch(`${base}/api/search/?page=-1`);
  assert.equal(invalid.status, 400);
});
await test('database pagination and numeric sorting return stable disjoint pages', async () => {
  const first = await get('/api/search/?sort=price-asc&pageSize=3');
  const second = await get('/api/search/?sort=price-asc&pageSize=3&page=2');
  assert.equal(
    first.total,
    await db.project.count({
      where: { deletedAt: null, status: { not: 'ARCHIVED' } },
    }),
  );
  assert.equal(first.properties.length, 3);
  assert.equal(second.properties.length, 3);
  assert.ok(first.properties.at(-1).price <= second.properties[0].price);
  assert.ok(
    !first.properties.some((p: { id: string }) =>
      second.properties.some((q: { id: string }) => p.id === q.id),
    ),
  );
  const beyond = await get('/api/search/?page=100');
  assert.equal(beyond.total, first.total);
  assert.equal(beyond.properties.length, 0);
});
await test('recommendations, detail, sitemap and brochure read database projects', async () => {
  const response = await post('/api/recommendations/', {
    prompt: '3 BHK below 1.2 Cr in Visakhapatnam',
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).properties.length, 2);
  assert.equal(
    (await fetch(`${base}/residences/skyline-residences/`)).status,
    200,
  );
  const missing = await fetch(`${base}/residences/not-a-real-project/`);
  assert.ok([200, 404].includes(missing.status));
  assert.match(await missing.text(), /A different address awaits/);
  const sitemap = await fetch(`${base}/sitemap.xml`);
  assert.match(await sitemap.text(), /skyline-residences/);
  const before = await db.brochureDownload.count();
  const pdf = await fetch(`${base}/api/projects/skyline-residences/brochure/`);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.ok((await pdf.text()).startsWith('%PDF-1.4'));
  assert.equal(await db.brochureDownload.count(), before + 1);
});
await test('visits/enquiries persist atomically with idempotency, deduplication and histories', async () => {
  const project = await db.project.findUniqueOrThrow({
    where: { slug: 'skyline-residences' },
  });
  const foreign = await db.unit.findFirstOrThrow({
    where: { projectId: { not: project.id } },
  });
  const marker = randomUUID().slice(0, 8),
    contact = {
      idempotencyKey: randomUUID(),
      projectId: project.id,
      name: 'Fictional Phase Four QA',
      email: `qa-${marker}@example.test`,
      phone: `+919${String(Date.now()).slice(-9)}`,
      message: 'Fictional Phase 4 automated persistence check.',
    };
  const visit = {
    ...contact,
    preferredDate: new Date(Date.now() + 8 * 86400000)
      .toISOString()
      .slice(0, 10),
    preferredTime: '11:00',
    guestCount: 2,
  };
  const responses = await Promise.all([
    post('/api/visits/', visit),
    post('/api/visits/', visit),
  ]);
  assert.ok(responses.every((r) => r.status === 201));
  const ids = await Promise.all(responses.map((r) => r.json()));
  assert.equal(ids[0].id, ids[1].id);
  const saved = await db.siteVisit.findUniqueOrThrow({
    where: { id: ids[0].id },
    include: {
      lead: { include: { source: true, statusHistory: true } },
      statusHistory: true,
    },
  });
  assert.equal(saved.status, 'REQUESTED');
  assert.equal(saved.lead.status, 'NEW');
  assert.equal(saved.lead.source.code, 'SITE_VISIT');
  assert.equal(saved.statusHistory.length, 1);
  assert.equal(saved.lead.statusHistory.length, 1);
  const enquiry = { ...contact, idempotencyKey: randomUUID() };
  assert.equal((await post('/api/enquiries/', enquiry)).status, 201);
  assert.equal(
    await db.lead.count({
      where: { email: contact.email, projectId: project.id },
    }),
    1,
  );
  assert.equal(await db.enquiry.count({ where: { leadId: saved.leadId } }), 1);
  assert.equal(
    await db.conversionEvent.count({ where: { leadId: saved.leadId } }),
    2,
  );
  const before = await db.siteVisit.count();
  assert.equal(
    (
      await post('/api/visits/', {
        ...visit,
        idempotencyKey: randomUUID(),
        unitId: foreign.id,
      })
    ).status,
    400,
  );
  assert.equal(await db.siteVisit.count(), before);
  assert.equal(
    (await post('/api/visits/', { ...visit, guestCount: 3 })).status,
    409,
  );
  assert.equal(
    (await post('/api/enquiries/', { ...enquiry, email: 'bad' })).status,
    400,
  );
});
await test('anonymous event delivery is idempotent and contains only allowed metadata', async () => {
  const p = await db.project.findFirstOrThrow();
  const event = {
    eventKey: randomUUID(),
    kind: 'PROJECT_VIEWED',
    projectId: p.id,
    metadata: { filterCount: 2, secret: 'must be stripped' },
  };
  assert.equal((await post('/api/events/', event)).status, 204);
  assert.equal((await post('/api/events/', event)).status, 204);
  const record = await db.userEvent.findUniqueOrThrow({
    where: { eventKey: event.eventKey },
    include: { view: true },
  });
  assert.deepEqual(record.metadata, { filterCount: 2 });
  assert.ok(record.view);
});
await db.$disconnect();
