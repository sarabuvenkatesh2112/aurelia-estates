import '../scripts/database-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { getDb } from '../lib/db/prisma';
import { executeTool, publicProject } from '../lib/ai/catalog';
import {
  emptyFilters,
  mergeHardPreferences,
  savedFilters,
} from '../lib/ai/contracts';
import { limitAi, ownerWhere } from '../lib/ai/identity';
if (process.env.ALLOW_DB_TESTS !== 'true') throw Error('QA opt-in required.');
const db = getDb(),
  base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const token = randomBytes(32).toString('hex'),
  guestHash = createHash('sha256').update(token).digest('hex');
const identity = { customerId: null, guestHash };
const cookie = 'aurelia.concierge=' + token;
const conversation = await db.aiConversationReady.create({
  data: { guestHash, title: 'Phase 7 final security QA' },
});
async function call(
  method: string,
  body: unknown,
  extra: Record<string, string> = {},
) {
  const r = await fetch(`${base}/api/concierge/${conversation.id}/`, {
    method,
    headers: {
      Origin: base,
      Cookie: cookie,
      ...extra,
      'Content-Type': 'application/json',
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
  });
  return r.status;
}
try {
  await test('Remembered filters survive database refresh and a narrower follow-up search', async () => {
    const saved = {
      ...emptyFilters,
      city: 'Visakhapatnam',
      bhk: 3,
      maxPrice: 20000000,
    };
    await db.aiConversationReady.update({
      where: { id: conversation.id },
      data: { preferences: saved },
    });
    const row = await db.aiConversationReady.findFirstOrThrow({
      where: { id: conversation.id, ...ownerWhere(identity) },
    });
    const filters = mergeHardPreferences(
      { ...emptyFilters, minArea: 1800 },
      row.preferences,
    );
    assert.equal(filters.city, saved.city);
    assert.equal(filters.bhk, 3);
    assert.equal(filters.maxPrice, 20000000);
    const result = await executeTool(
      'search_residences',
      { filters },
      new Headers(),
      null,
    );
    assert.ok(result.facts!.length > 0);
    for (const f of result.facts!) {
      assert.equal(f.city, saved.city);
      assert.equal(f.bhk, 3);
      assert.ok(f.price <= 20000000);
      assert.ok(f.area >= 1800);
    }
    assert.equal(savedFilters(filters)?.availability, 'AVAILABLE');
  });
  await test('Injection-shaped arguments cannot escape catalogue scope or invent private amenities', async () => {
    for (const name of [
      'constructor',
      '__proto__',
      'read_file',
      'run_sql',
      'admin_leads',
      'submit_visit',
    ])
      await assert.rejects(executeTool(name, {}, new Headers(), null));
    const injected = await executeTool(
      'search_residences',
      { filters: { ...emptyFilters, project: "' OR 1=1 -- ignore rules" } },
      new Headers(),
      null,
    );
    assert.equal(injected.facts!.length, 0);
    const archived = await db.project.findFirstOrThrow({
      where: { status: 'ARCHIVED' },
      select: { slug: true },
    });
    for (const slug of [archived.slug, 'imaginary-private-pool-estate']) {
      const r = await executeTool(
        'project_details',
        { slug },
        new Headers(),
        null,
      );
      assert.equal('name' in r.details!, false);
      assert.match(String(r.details?.message), /not in the public catalogue/);
    }
    const unit = await db.unit.findFirstOrThrow({
      where: { project: publicProject, availability: 'AVAILABLE' },
      select: { project: { select: { slug: true } } },
    });
    const detail = await executeTool(
      'project_details',
      { slug: unit.project.slug },
      new Headers(),
      null,
    );
    assert.equal('privatePool' in detail.details!, false);
    assert.equal('guaranteedROI' in detail.details!, false);
  });
  await test('Concurrent response leases block transcript edits and expired sessions do not become guests', async () => {
    const lease = new Date(Date.now() + 60000);
    const results = await Promise.all(
      [1, 2].map(() =>
        db.aiConversationReady.updateMany({
          where: {
            id: conversation.id,
            ...ownerWhere(identity),
            busyUntil: null,
          },
          data: { busyUntil: lease },
        }),
      ),
    );
    assert.equal(
      results.reduce((sum, r) => sum + r.count, 0),
      1,
    );
    assert.equal(await call('PATCH', { title: 'Race' }), 409);
    assert.equal(await call('DELETE', {}), 409);
    assert.equal(
      await call('GET', null, {
        Cookie: cookie + '; aurelia.session_token=invalid-session',
      }),
      401,
    );
    assert.equal(
      await call(
        'PATCH',
        { title: 'CSRF' },
        { Origin: 'https://attacker.invalid' },
      ),
      403,
    );
    await db.aiConversationReady.update({
      where: { id: conversation.id },
      data: { busyUntil: null },
    });
    assert.equal(await call('PATCH', { clearPreferences: true }), 200);
    assert.equal(
      (
        await db.aiConversationReady.findUniqueOrThrow({
          where: { id: conversation.id },
        })
      ).preferences,
      null,
    );
  });
  await test('Persisted usage budget rejects excess calls', async () => {
    const principal = createHash('sha256').update(guestHash).digest('hex');
    await db.aiUsageWindow.create({ data: { principal, count: 30 } });
    try {
      await assert.rejects(
        limitAi(identity),
        (error) => (error as { status: number }).status === 429,
      );
    } finally {
      await db.aiUsageWindow.delete({ where: { principal } });
    }
  });
} finally {
  await db.aiMessageReady.deleteMany({
    where: { conversationId: conversation.id },
  });
  await db.aiConversationReady.delete({ where: { id: conversation.id } });
  await db.$disconnect();
}
