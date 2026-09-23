import 'server-only';
import { z } from 'zod';
import { getDb } from '@/lib/db/prisma';
import { requireCustomer } from '@/lib/auth/server';
import { PublicError } from '@/lib/http';
import { customerOperation } from '@/lib/repositories/customerRepository';
import { savedSearchSchema } from '@/lib/validation/customer';
import { projectDetail } from '@/lib/services/projectService';
import { publicFacts } from './catalog';
import { filtersSchema, savedFilters, type ToolReference } from './contracts';

export async function confirmedAction(
  conversationId: string,
  raw: unknown,
  headers: Headers,
) {
  const input = z
    .object({
      messageId: z.uuid(),
      action: z.enum([
        'shortlist',
        'remove_shortlist',
        'save_search',
        'visit',
        'enquiry',
      ]),
      unitId: z.uuid().optional(),
      name: z.string().max(60).optional(),
    })
    .strict()
    .parse(raw);
  const message = await getDb().aiMessageReady.findFirst({
    where: { id: input.messageId, conversationId, role: 'assistant' },
    select: { references: true },
  });
  if (!message)
    throw new PublicError('This suggestion is no longer available.', 404);
  const refs = message.references as unknown as ToolReference[];
  if (input.action === 'save_search') {
    const user = await requireCustomer(headers);
    const latest = refs.findLast((r) => r.filters)?.filters;
    if (!latest) throw new PublicError('Search for a residence first.');
    const filters = savedFilters(filtersSchema.parse(latest));
    if (!filters)
      throw new PublicError(
        'This detailed search cannot be saved yet. Keep this conversation instead.',
      );
    const parsed = savedSearchSchema.parse({
      name: input.name || 'My concierge search',
      filters,
    });
    // Serialize per customer so retries and double-clicks reuse the same saved search.
    return getDb().$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id + '-ai-search'}))`;
      const existing = await tx.savedSearchReady.findFirst({
        where: { customerId: user.id, filters: { equals: parsed.filters } },
        select: { id: true },
      });
      return (
        existing ||
        tx.savedSearchReady.create({
          data: {
            customerId: user.id,
            name: parsed.name,
            filters: parsed.filters,
          },
          select: { id: true },
        })
      );
    });
  }
  const mentioned = refs
    .flatMap((r) => r.facts || [])
    .find((u) => u.id === input.unitId);
  if (!mentioned)
    throw new PublicError('Choose a residence from this conversation.');
  const unit = (await publicFacts([mentioned.id]))[0];
  if (!unit)
    throw new PublicError('This residence is no longer available.', 404);
  if (input.action === 'shortlist')
    return customerOperation(
      'POST',
      ['favorites'],
      { projectId: unit.projectId },
      headers,
    );
  if (input.action === 'remove_shortlist') {
    const user = await requireCustomer(headers);
    await getDb().favoriteReady.deleteMany({
      where: { customerId: user.id, projectId: unit.projectId },
    });
    return { removed: true };
  }
  if (unit.availability !== 'AVAILABLE' && input.action === 'visit')
    throw new PublicError(
      'This residence is no longer available for a visit. Please refresh your search.',
    );
  const detail = await projectDetail(unit.slug);
  if (!detail) throw new PublicError('This project is unavailable.', 404);
  return {
    property: detail.property,
    unitId: unit.id,
    advisor: input.action === 'enquiry',
  };
}
