import 'server-only';
import { z } from 'zod';
import { getDb } from '@/lib/db/prisma';
import { PublicError } from '@/lib/http';
const schema = z.object({
  eventKey: z.uuid(),
  kind: z.enum([
    'PROJECT_VIEWED',
    'UNIT_VIEWED',
    'FILTER_USED',
    'SEARCH_PERFORMED',
    'SCHEDULE_VISIT_STARTED',
    'AI_ASSISTANT_OPENED',
  ]),
  projectId: z.uuid().optional(),
  unitId: z.uuid().optional(),
  source: z
    .enum([
      'DIRECT',
      'GOOGLE',
      'INSTAGRAM',
      'FACEBOOK',
      'META_AD',
      'WHATSAPP',
      'REFERRAL',
    ])
    .default('DIRECT'),
  metadata: z
    .object({
      filterCount: z.number().int().min(0).max(20).optional(),
      resultCount: z.number().int().min(0).max(1000000).optional(),
    })
    .optional(),
});
export async function recordEvent(raw: unknown) {
  const input = schema.parse(raw),
    db = getDb();
  if (
    ['PROJECT_VIEWED', 'UNIT_VIEWED'].includes(input.kind) &&
    !input.projectId
  )
    throw new PublicError('A project is required.');
  if (input.kind === 'UNIT_VIEWED' && !input.unitId)
    throw new PublicError('A unit is required.');
  if (
    input.unitId &&
    !(await db.unit.findFirst({
      where: { id: input.unitId, projectId: input.projectId },
    }))
  )
    throw new PublicError('Unknown unit.');
  if (
    input.projectId &&
    !(await db.project.findFirst({
      where: {
        id: input.projectId,
        deletedAt: null,
        status: { not: 'ARCHIVED' },
      },
    }))
  )
    throw new PublicError('Unknown project.');
  const source = await db.trafficSource.findUnique({
    where: { code: input.source },
  });
  return db.userEvent.upsert({
    where: { eventKey: input.eventKey },
    update: {},
    create: {
      eventKey: input.eventKey,
      kind: input.kind,
      projectId: input.projectId,
      unitId: input.unitId,
      trafficSourceId: source?.id,
      metadata: input.metadata,
      ...(input.kind === 'PROJECT_VIEWED' && input.projectId
        ? { view: { create: { projectId: input.projectId } } }
        : {}),
    },
    select: { id: true },
  });
}
