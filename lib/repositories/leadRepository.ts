import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { getDb } from '@/lib/db/prisma';
import {
  LEAD_WINDOW_DAYS,
  normalizedPhone,
  type EnquiryInput,
  type VisitInput,
} from '@/lib/validation/forms';
import { PublicError } from '@/lib/http';
import { createHash, randomUUID } from 'node:crypto';

type Contact = EnquiryInput | VisitInput;
export function leadMatch(
  input: Contact,
  now = new Date(),
): Prisma.LeadWhereInput {
  return {
    projectId: input.projectId,
    deletedAt: null,
    createdAt: { gte: new Date(now.getTime() - LEAD_WINDOW_DAYS * 86400000) },
    OR: [{ email: input.email }, { phone: normalizedPhone(input.phone) }],
  };
}
export async function saveContact(
  kind: 'enquiry' | 'visit',
  input: Contact,
  customerId: string | null = null,
) {
  const db = getDb();
  const payloadHash = createHash('sha256')
    .update(JSON.stringify({ ...input, customerId }))
    .digest('hex');
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          const existing =
            kind === 'visit'
              ? await tx.siteVisit.findUnique({
                  where: { idempotencyKey: input.idempotencyKey },
                })
              : await tx.enquiry.findUnique({
                  where: { idempotencyKey: input.idempotencyKey },
                });
          if (existing) {
            if (
              existing.customerId !== customerId ||
              existing.payloadHash !== payloadHash
            )
              throw new PublicError(
                'This request has already been used. Please begin a new request.',
                409,
              );
            return {
              id: existing.id,
              reference: existing.reference,
              replayed: true,
            };
          }
          const project = await tx.project.findFirst({
            where: {
              id: input.projectId,
              deletedAt: null,
              status: { not: 'ARCHIVED' },
            },
          });
          if (!project)
            throw new PublicError('Please choose an available project.');
          if (
            input.unitId &&
            !(await tx.unit.findFirst({
              where: { id: input.unitId, projectId: input.projectId },
            }))
          )
            throw new PublicError(
              'This unit does not belong to the selected project.',
            );
          let configurationName = '';
          if (kind === 'visit') {
            const visit = input as VisitInput;
            if (visit.configurationId) {
              const configuration = await tx.unitType.findFirst({
                where: {
                  id: visit.configurationId,
                  projectId: input.projectId,
                },
                select: { name: true },
              });
              if (!configuration)
                throw new PublicError(
                  'Choose a configuration for this project.',
                );
              configurationName = configuration.name;
            }
            if (
              input.unitId &&
              !(await tx.unit.findFirst({
                where: {
                  id: input.unitId,
                  projectId: input.projectId,
                  availability: 'AVAILABLE',
                  ...(visit.configurationId
                    ? { unitTypeId: visit.configurationId }
                    : {}),
                },
              }))
            )
              throw new PublicError(
                'This residence is no longer available for a visit. Please choose another.',
              );
          }
          const recent = {
            email: input.email,
            createdAt: { gte: new Date(Date.now() - 5 * 60000) },
          };
          const requests =
            (await tx.enquiry.count({ where: recent })) +
            (await tx.siteVisit.count({ where: recent }));
          if (requests >= 5)
            throw new PublicError(
              'Please wait a few minutes before sending another request.',
              429,
            );
          let lead = await tx.lead.findFirst({
            where: { ...leadMatch(input), customerId },
            orderBy: { createdAt: 'desc' },
          });
          if (!lead) {
            const source = await tx.leadSource.findUniqueOrThrow({
              where: { code: kind === 'visit' ? 'SITE_VISIT' : 'WEBSITE' },
            });
            lead = await tx.lead.create({
              data: {
                customerId,
                name: input.name,
                email: input.email,
                phone: normalizedPhone(input.phone),
                projectId: input.projectId,
                unitId: input.unitId,
                sourceId: source.id,
                status: 'NEW',
                statusHistory: {
                  create: { newStatus: 'NEW', note: 'Initial website request' },
                },
              },
            });
          }
          const contact = {
            customerId,
            reference:
              (kind === 'visit' ? 'AV-' : 'AE-') +
              randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase(),
            idempotencyKey: input.idempotencyKey,
            payloadHash,
            leadId: lead.id,
            projectId: input.projectId,
            name: input.name,
            email: input.email,
            phone: normalizedPhone(input.phone),
            message: configurationName
              ? 'Configuration preference: ' +
                configurationName +
                '\n' +
                input.message
              : input.message,
          };
          const record =
            kind === 'visit'
              ? await tx.siteVisit.create({
                  data: {
                    ...contact,
                    unitId: input.unitId,
                    preferredDate: new Date(
                      (input as VisitInput).preferredDate,
                    ),
                    preferredTime: (input as VisitInput).preferredTime,
                    guestCount: (input as VisitInput).guestCount,
                    status: 'REQUESTED',
                    statusHistory: {
                      create: {
                        newStatus: 'REQUESTED',
                        note: 'Requested, not a confirmed slot',
                      },
                    },
                  },
                })
              : await tx.enquiry.create({ data: contact });
          const event = await tx.userEvent.create({
            data: {
              eventKey: randomUUID(),
              kind:
                kind === 'visit'
                  ? 'SCHEDULE_VISIT_SUBMITTED'
                  : 'ENQUIRY_SUBMITTED',
              projectId: input.projectId,
              unitId: input.unitId,
            },
          });
          await tx.conversionEvent.create({
            data: { eventId: event.id, leadId: lead.id, kind },
          });
          return {
            id: record.id,
            reference: record.reference,
            replayed: false,
          };
        },
        { isolationLevel: 'Serializable', timeout: 15000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2002'].includes(error.code) &&
        attempt < 3
      )
        continue;
      throw error;
    }
  }
  throw new PublicError('Please try again shortly.', 503);
}
