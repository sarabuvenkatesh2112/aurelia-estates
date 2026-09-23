import './database-env.mjs';
import assert from 'node:assert/strict';
import { getDb } from '../lib/db/prisma';
import { setTimeout } from 'node:timers/promises';
const db = getDb(),
  base = 'http://localhost:3000';
let id = '',
  cookie = '';
async function req(path: string, method = 'GET', body?: unknown) {
  return fetch(base + '/api/concierge/' + path, {
    method,
    headers: {
      Origin: base,
      Cookie: cookie,
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
try {
  const init = await req('');
  cookie = init.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  const create = await req('', 'POST', {});
  assert.equal(create.status, 201);
  id = (await create.json()).id;
  const abort = new AbortController();
  const r = await fetch(base + '/api/concierge/' + id + '/messages/', {
    method: 'POST',
    headers: {
      Origin: base,
      Cookie: cookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'Compare available three bedroom homes.' }),
    signal: abort.signal,
  });
  assert.equal(r.status, 200);
  const reader = r.body!.getReader();
  const first = await reader.read();
  assert.ok(first.value?.length);
  abort.abort();
  try {
    await reader.read();
  } catch {}
  let released = false;
  for (let i = 0; i < 30; i++) {
    const row = await db.aiConversationReady.findUniqueOrThrow({
      where: { id },
    });
    if (row.busyUntil === null) {
      released = true;
      break;
    }
    await setTimeout(500);
  }
  assert.equal(released, true, 'Cancelled response releases its lease');
  assert.equal(
    await db.aiMessageReady.count({
      where: { conversationId: id, role: 'assistant' },
    }),
    0,
  );
  assert.equal(
    (await req(id + '/', 'PATCH', { title: 'Phase 7 cancellation verified' }))
      .status,
    200,
  );
  console.log(
    JSON.stringify({
      realHttpAbort: true,
      leaseReleased: true,
      noAssistantCompletion: true,
      conversationEditable: true,
    }),
  );
} finally {
  if (id) await req(id + '/', 'DELETE', {});
  await db.$disconnect();
}
