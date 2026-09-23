import test from 'node:test';
import assert from 'node:assert/strict';
import { sequenceTransaction } from '../lib/db/sequenced-pg';

await test('transaction queue drains once before release, including failures and savepoints', async () => {
  const events: string[] = [];
  let active = 0;
  const operation = async (name: string) => {
    assert.equal(
      active++,
      0,
      'one operation at a time on a transaction client',
    );
    events.push(name);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active--;
    if (name === 'failed') throw new Error('expected SQL failure');
  };
  const tx = sequenceTransaction({
    provider: 'postgres',
    adapterName: 'test',
    options: { usePhantomQuery: false },
    queryRaw: async (q) => {
      await operation(q.sql);
      return { columnNames: [], columnTypes: [], rows: [] };
    },
    executeRaw: async (q) => {
      await operation(q.sql);
      return 1;
    },
    createSavepoint: (name) => operation(name),
    rollbackToSavepoint: (name) => operation('restore ' + name),
    releaseSavepoint: (name) => operation('release ' + name),
    commit: () => operation('commit'),
    rollback: () => operation('rollback'),
  });
  const query = (sql: string) => ({ sql, args: [], argTypes: [] });
  const tasks = [
    tx.queryRaw(query('read')),
    tx.createSavepoint!('s'),
    tx.executeRaw(query('failed')),
    tx.rollbackToSavepoint!('s'),
    tx.executeRaw(query('write')),
    tx.releaseSavepoint!('s'),
    tx.rollback(),
  ];
  const results = await Promise.allSettled(tasks);
  assert.equal(results[2].status, 'rejected');
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 6);
  await tx.rollback();
  await assert.rejects(tx.queryRaw(query('too late')), /already finished/);
  assert.deepEqual(events, [
    'read',
    's',
    'failed',
    'restore s',
    'write',
    'release s',
    'rollback',
  ]);
});

await test('separate transaction queues remain independent', async () => {
  let unblock!: () => void;
  const gate = new Promise<void>((resolve) => {
    unblock = resolve;
  });
  const make = (wait: Promise<void>) =>
    sequenceTransaction({
      provider: 'postgres',
      adapterName: 'test',
      options: { usePhantomQuery: false },
      queryRaw: async () => {
        await wait;
        return { columnNames: [], columnTypes: [], rows: [] };
      },
      executeRaw: async () => 0,
      commit: async () => {},
      rollback: async () => {},
    });
  const blocked = make(gate).queryRaw({ sql: '', args: [], argTypes: [] });
  await make(Promise.resolve()).queryRaw({ sql: '', args: [], argTypes: [] });
  unblock();
  await blocked;
});
