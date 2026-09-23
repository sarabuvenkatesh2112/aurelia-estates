import './database-env.mjs';
import { getDb } from '../lib/db/prisma';
import { executeTool } from '../lib/ai/catalog';
import { emptyFilters } from '../lib/ai/contracts';
if (process.env.ALLOW_DB_TESTS !== 'true') throw Error('QA opt-in required.');
const db = getDb();
try {
  const conversation = await db.aiConversationReady.findFirstOrThrow({
    where: { title: 'Phase 7 browser QA', customerId: null, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  const search = await executeTool(
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
  const compare = await executeTool(
    'compare_units',
    { ids: search.facts!.slice(0, 2).map((f) => f.id) },
    new Headers(),
    null,
  );
  await db.aiMessageReady.create({
    data: {
      conversationId: conversation.id,
      role: 'assistant',
      content:
        '[QA fixture — not an AI response] These live catalogue facts are provided only to verify card, comparison and form layouts while the provider is unconfigured.',
      references: JSON.parse(JSON.stringify([search, compare])),
    },
  });
  await db.aiConversationReady.update({
    where: { id: conversation.id },
    data: { preferences: search.filters },
  });
  console.log(
    'Isolated browser QA fixture prepared from live public facts. No model call or lead created.',
  );
} catch {
  console.error(
    'Browser fixture preparation failed; private diagnostics withheld.',
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
