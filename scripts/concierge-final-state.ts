import './database-env.mjs';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { getDb } from '../lib/db/prisma';
import { executeTool } from '../lib/ai/catalog';
const db = getDb(),
  file = '.cache/phase7-auth-live-audit.json',
  s = JSON.parse(readFileSync(file, 'utf8'));
try {
  const r = s.cases.find(
    (c: { name: string; done: boolean }) =>
      c.name === 'authenticated' && c.done,
  );
  assert.ok(r);
  for (const ref of r.references) {
    assert.equal(ref.kind, 'my_collection');
    const fresh = await executeTool(
      ref.kind,
      { section: ref.details.section },
      new Headers({
        Cookie: s.cookie,
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      }),
      null,
    );
    assert.ok(
      isDeepStrictEqual(ref, fresh),
      'Model tool references equal current authenticated records',
    );
  }
  assert.ok(
    !/password|agentId|leadId|internalNotes|authSession/.test(
      JSON.stringify(r.references),
    ),
  );
  assert.deepEqual(
    {
      leads: await db.lead.count(),
      visits: await db.siteVisit.count(),
      enquiries: await db.enquiry.count(),
    },
    s.counts,
    'Model and handoffs created no business requests',
  );
  const c = s.cleanup;
  if (!c.favoriteExisted)
    await db.favoriteReady.deleteMany({
      where: { customerId: c.customerId, projectId: c.projectId },
    });
  if (!c.savedExisted && c.savedId)
    await db.savedSearchReady.deleteMany({
      where: { id: c.savedId, customerId: c.customerId },
    });
  s.cleanupComplete = true;
  writeFileSync(file, JSON.stringify(s, null, 2));
  console.log(
    JSON.stringify({
      authenticatedModelFactsMatchOwner: true,
      noStaffFields: true,
      noUnconfirmedBusinessWrites: true,
      temporaryFavoriteAndSearchRestored: true,
    }),
  );
} finally {
  await db.$disconnect();
}
