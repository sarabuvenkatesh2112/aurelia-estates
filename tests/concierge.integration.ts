import '../scripts/database-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDb } from '../lib/db/prisma';
import { executeTool, publicProject } from '../lib/ai/catalog';
import { emptyFilters, type ToolReference } from '../lib/ai/contracts';
if (process.env.ALLOW_DB_TESTS !== 'true')
  throw Error('Explicit database test opt-in required.');
const db = getDb(),
  base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const qa = JSON.parse(readFileSync('.cache/phase6-qa.json', 'utf8')) as {
  password: string;
  identities: Record<string, { email: string }>;
};
const conversations: string[] = [];
async function call(path: string, method = 'GET', body?: unknown, cookie = '') {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: base,
      Cookie: cookie,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  return {
    status: response.status,
    data,
    cookie: response.headers
      .getSetCookie()
      .map((v) => v.split(';')[0])
      .join('; '),
  };
}
async function signIn(role: string) {
  const r = await call('/api/auth/sign-in/email/', 'POST', {
    email: qa.identities[role].email,
    password: qa.password,
  });
  assert.equal(r.status, 200, 'Existing QA identity can sign in');
  return r.cookie;
}
await test('Phase 7 live Neon tools and private conversation boundaries', async (t) => {
  const customer = await signIn('CUSTOMER'),
    other = await signIn('VIEWER');
  let guest = '',
    conversation = '',
    assistant = '',
    facts: ToolReference;
  const before = {
    projects: await db.project.count({ where: publicProject }),
    units: await db.unit.count({ where: { project: publicProject } }),
    leads: await db.lead.count(),
  };
  try {
    await t.test(
      'Exact unit filters, truthful no-results, public isolation and comparisons',
      async () => {
        facts = await executeTool(
          'search_residences',
          {
            filters: {
              ...emptyFilters,
              city: 'Visakhapatnam',
              bhk: 3,
              maxPrice: 20000000,
            },
          },
          new Headers(),
          null,
        );
        assert.ok(facts.facts!.length > 0);
        assert.ok(facts.facts!.length <= 6);
        for (const unit of facts.facts!) {
          assert.equal(unit.city, 'Visakhapatnam');
          assert.equal(unit.bhk, 3);
          assert.ok(unit.price <= 20000000);
          assert.equal(unit.availability, 'AVAILABLE');
        }
        const none = await executeTool(
          'search_residences',
          { filters: { ...emptyFilters, maxPrice: 1 } },
          new Headers(),
          null,
        );
        assert.equal(none.facts!.length, 0);
        const unknown = await executeTool(
          'project_details',
          { slug: 'unknown-private-pool-palace' },
          new Headers(),
          null,
        );
        assert.match(
          String(unknown.details?.message),
          /not in the public catalogue/,
        );
        const archive = await db.unit.findFirstOrThrow({
          where: { project: { status: 'ARCHIVED' } },
        });
        await assert.rejects(
          executeTool(
            'compare_units',
            { ids: [archive.id, facts.facts![0].id] },
            new Headers(),
            null,
          ),
        );
        if (facts.facts!.length > 1) {
          const compared = await executeTool(
            'compare_units',
            { ids: facts.facts!.slice(0, 2).map((f) => f.id) },
            new Headers(),
            null,
          );
          assert.equal(compared.facts!.length, 2);
        }
        await assert.rejects(
          executeTool('sql', { sql: 'DROP TABLE' }, new Headers(), null),
        );
        await assert.rejects(
          executeTool(
            'my_collection',
            { section: 'visits', customerId: crypto.randomUUID() },
            new Headers(),
            null,
          ),
        );
      },
    );
    await t.test(
      'Guest create/read/rename, foreign guest denial, no-key failure and payload rejection',
      async () => {
        const init = await call('/api/concierge/');
        guest = init.cookie;
        assert.ok(guest.includes('aurelia.concierge='));
        const created = await call('/api/concierge/', 'POST', {}, guest);
        assert.equal(created.status, 201);
        conversation = created.data.id;
        conversations.push(conversation);
        assert.equal(
          (
            await call(
              '/api/concierge/' + conversation + '/',
              'GET',
              undefined,
              guest,
            )
          ).status,
          200,
        );
        assert.equal(
          (await call('/api/concierge/' + conversation + '/')).status,
          404,
        );
        assert.equal(
          (
            await call(
              '/api/concierge/' + conversation + '/',
              'PATCH',
              { title: 'Phase 7 isolated QA' },
              guest,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await call(
              '/api/concierge/' + conversation + '/messages/',
              'POST',
              { message: 'Find homes', customerId: crypto.randomUUID() },
              guest,
            )
          ).status,
          400,
        );
        if (!init.data.ready)
          assert.equal(
            (
              await call(
                '/api/concierge/' + conversation + '/messages/',
                'POST',
                { message: 'Find homes' },
                guest,
              )
            ).status,
            503,
          );
        assert.equal(
          await db.aiMessageReady.count({
            where: { conversationId: conversation },
          }),
          0,
          'No fabricated answer is persisted',
        );
      },
    );
    await t.test(
      'Guest claim is cookie-bound; account and staff identities cannot read another conversation',
      async () => {
        assert.equal(
          (
            await call(
              '/api/concierge/' + conversation + '/claim/',
              'POST',
              {},
              other,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await call(
              '/api/concierge/' + conversation + '/claim/',
              'POST',
              {},
              customer + '; ' + guest,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await call(
              '/api/concierge/' + conversation + '/',
              'GET',
              undefined,
              guest,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await call(
              '/api/concierge/' + conversation + '/',
              'GET',
              undefined,
              other,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await call(
              '/api/concierge/' + conversation + '/',
              'PATCH',
              { title: 'Hijack' },
              other,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await call(
              '/api/concierge/' + conversation + '/',
              'DELETE',
              {},
              other,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await call(
              '/api/concierge/' + conversation + '/',
              'GET',
              undefined,
              customer,
            )
          ).status,
          200,
        );
        assert.equal(
          (await call('/api/admin/leads/', 'GET', undefined, customer)).status,
          403,
        );
      },
    );
    await t.test(
      'Account tools omit staff fields; confirmed actions are owner-bound and idempotent',
      async () => {
        for (const section of [
          'shortlist',
          'saved_searches',
          'visits',
          'enquiries',
        ]) {
          await assert.rejects(
            executeTool('my_collection', { section }, new Headers(), null),
          );
          const own = await executeTool(
            'my_collection',
            { section },
            new Headers({
              Cookie: customer,
              host: new URL(base).host,
              origin: base,
            }),
            null,
          );
          assert.ok(
            !/password|agentId|leadId|internalNotes|authSession/.test(
              JSON.stringify(own),
            ),
          );
        }
        assistant = (
          await db.aiMessageReady.create({
            data: {
              conversationId: conversation,
              role: 'assistant',
              content:
                '[QA fixture] Live tool facts for action tests. This is not a model response.',
              references: JSON.parse(JSON.stringify([facts])),
            },
          })
        ).id;
        const unit = facts.facts![0];
        const user = await db.customer.findUniqueOrThrow({
          where: { email: qa.identities.CUSTOMER.email },
        });
        const hadFavorite = await db.favoriteReady.findUnique({
          where: {
            customerId_projectId: {
              customerId: user.id,
              projectId: unit.projectId,
            },
          },
        });
        const input = {
          messageId: assistant,
          action: 'shortlist',
          unitId: unit.id,
        };
        assert.equal(
          (
            await call(
              '/api/concierge/' + conversation + '/actions/',
              'POST',
              input,
              other,
            )
          ).status,
          404,
        );
        for (let i = 0; i < 2; i++)
          assert.equal(
            (
              await call(
                '/api/concierge/' + conversation + '/actions/',
                'POST',
                input,
                customer,
              )
            ).status,
            200,
          );
        assert.equal(
          await db.favoriteReady.count({
            where: { customerId: user.id, projectId: unit.projectId },
          }),
          1,
        );
        if (!hadFavorite)
          await call(
            '/api/concierge/' + conversation + '/actions/',
            'POST',
            { ...input, action: 'remove_shortlist' },
            customer,
          );
        const beforeSearch = await db.savedSearchReady.findMany({
          where: { customerId: user.id },
          select: { id: true },
        });
        const saved = await Promise.all(
          [1, 2].map(() =>
            call(
              '/api/concierge/' + conversation + '/actions/',
              'POST',
              { messageId: assistant, action: 'save_search' },
              customer,
            ),
          ),
        );
        assert.equal(saved[0].status, 200);
        assert.equal(saved[1].status, 200);
        assert.equal(saved[0].data.id, saved[1].data.id);
        if (!beforeSearch.some((s) => s.id === saved[0].data.id))
          await db.savedSearchReady.delete({ where: { id: saved[0].data.id } });
        for (const action of ['visit', 'enquiry']) {
          const prepared = await call(
            '/api/concierge/' + conversation + '/actions/',
            'POST',
            { ...input, action },
            customer,
          );
          assert.equal(prepared.status, 200);
          assert.equal(prepared.data.property.id, unit.projectId);
          assert.equal(prepared.data.unitId, unit.id);
        }
        assert.equal(
          await db.lead.count(),
          before.leads,
          'Preparing actions must not create leads',
        );
        assert.equal(
          (
            await call(
              '/api/concierge/' + conversation + '/actions/',
              'POST',
              { ...input, unitId: crypto.randomUUID() },
              customer,
            )
          ).status,
          400,
        );
      },
    );
    await t.test(
      'Deletion removes transcript content and revoked browser QA access stays disabled',
      async () => {
        assert.equal(
          (
            await call(
              '/api/concierge/' + conversation + '/',
              'DELETE',
              {},
              customer,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await call(
              '/api/concierge/' + conversation + '/',
              'GET',
              undefined,
              customer,
            )
          ).status,
          404,
        );
        assert.equal(
          await db.aiMessageReady.count({
            where: { conversationId: conversation },
          }),
          0,
        );
        assert.equal(
          await db.agent.count({
            where: {
              email: 'phase5-browser-1789283702224@example.test',
              active: true,
            },
          }),
          0,
        );
        assert.equal(
          await db.project.count({ where: publicProject }),
          before.projects,
        );
        assert.equal(
          await db.unit.count({ where: { project: publicProject } }),
          before.units,
        );
      },
    );
  } finally {
    await db.aiMessageReady.deleteMany({
      where: { conversationId: { in: conversations } },
    });
    await db.aiConversationReady.deleteMany({
      where: { id: { in: conversations } },
    });
    await db.$disconnect();
  }
});
