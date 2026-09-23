import '../scripts/database-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { getDb } from '../lib/db/prisma';
import { SequencedPrismaPg } from '../lib/db/sequenced-pg';
import {
  getProjectRecord,
  searchProjects,
} from '../lib/repositories/projectRepository';
import { searchSchema } from '../lib/validation/search';

const db = getDb();
const warnings: string[] = [];
const onWarning = (warning: Error) => {
  warnings.push(warning.message);
};
process.on('warning', onWarning);
// Observe the physical client boundary, without changing query execution,
// printing SQL/arguments, or reading deprecated public pg accessors.
let overlaps = 0;
const original = Reflect.get(
  pg.Client.prototype,
  'query',
) as pg.Client['query'];
pg.Client.prototype.query = function (this: pg.Client, ...args: unknown[]) {
  if ((this as unknown as { _activeQuery: unknown })._activeQuery) overlaps++;
  return Reflect.apply(original, this, args);
} as typeof original;
try {
  await test('concurrent catalogue relation loads retain data without re-entering pg clients', async () => {
    const filters = searchSchema.parse({ bhk: 3, availability: 'AVAILABLE' });
    const baseline = await searchProjects(filters);
    if (process.env.DB_TARGET !== 'local') assert.ok(baseline.total > 0);
    const results = await Promise.all(
      Array.from({ length: 6 }, () => searchProjects(filters)),
    );
    for (const result of results) assert.deepEqual(result, baseline);
    const project = await getProjectRecord('the-eastern-grove');
    if (project || process.env.DB_TARGET !== 'local') {
      assert.ok(project?.amenities.length);
      assert.ok(project.towers.length);
      assert.ok(project.unitTypes.length);
    }
  });
  await test('concurrent transactional writes execute once, commit, and recover after SQL failure', async () => {
    await db.$transaction(async (tx) => {
      // Connection-local, automatically dropped at commit; no persisted QA data.
      await tx.$executeRaw`CREATE TEMP TABLE aurelia_sequence_audit (id integer PRIMARY KEY) ON COMMIT DROP`;
      await Promise.all(
        [1, 2, 3].map(
          (id) =>
            tx.$executeRaw`INSERT INTO aurelia_sequence_audit VALUES (${id})`,
        ),
      );
      const [row] = await tx.$queryRaw<
        { count: bigint }[]
      >`SELECT count(*) AS count FROM aurelia_sequence_audit`;
      assert.equal(row.count, BigInt(3));
    });
    await assert.rejects(
      db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 / 0`;
      }),
    );
    // More than pool.max successful follow-up transactions catches leaked leases.
    const count = await db.project.count();
    for (let i = 0; i < 7; i++) {
      await db.$transaction(async (tx) => {
        assert.equal(await tx.project.count(), count);
      });
    }
  });
  await test('transaction finalization returns every checked-out connection and disposal closes the pool', async () => {
    const adapter = await new SequencedPrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 2,
      connectionTimeoutMillis: 15000,
    }).connect();
    const pool = adapter.underlyingDriver();
    try {
      const tx = await adapter.startTransaction('REPEATABLE READ');
      const query = { sql: 'SELECT 1', args: [], argTypes: [] };
      // Finalization is requested while earlier operations are still queued.
      await Promise.all([
        tx.queryRaw(query),
        tx.queryRaw(query),
        tx.executeRaw({ ...query, sql: 'ROLLBACK' }),
        tx.rollback(),
      ]);
      assert.equal(pool.totalCount, pool.idleCount);
      assert.equal(pool.waitingCount, 0);
    } finally {
      await adapter.dispose();
    }
    assert.equal(pool.totalCount, 0);
  });
  await test('physical pg calls never overlap and no queue deprecation is emitted', async () => {
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(overlaps, 0);
    assert.ok(!warnings.some((message) => message.includes('client.query()')));
  });
} finally {
  await db.$disconnect();
  pg.Client.prototype.query = original;
  process.removeListener('warning', onWarning);
}
