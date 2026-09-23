import 'server-only';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { getDb } from '@/lib/db/prisma';
import { PublicError } from '@/lib/http';
import type { Prisma, WhatsAppStatus } from '@/generated/prisma/client';
import {
  canonicalWhatsAppPhone,
  communicationText,
  inboundIntent,
  nextStatus,
} from './contracts';
type Tx = Prisma.TransactionClient;
const stamp = z
  .string()
  .regex(/^\d{1,12}$/)
  .transform((v) => new Date(Number(v) * 1000))
  .refine(
    (d) => Number.isFinite(d.getTime()) && d.getTime() <= Date.now() + 300000,
  );
const message = z.object({
  id: z.string().min(1).max(300),
  from: z.string().max(30),
  timestamp: stamp,
  type: z.string().max(50),
  text: z.object({ body: z.string().max(4096) }).optional(),
});
const status = z.object({
  id: z.string().max(300),
  recipient_id: z.string().max(30),
  timestamp: stamp,
  status: z.enum(['sent', 'delivered', 'read', 'failed']),
  biz_opaque_callback_data: z.string().max(100).optional(),
  errors: z
    .array(z.object({ code: z.number().int() }))
    .max(5)
    .optional(),
});
const envelope = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z
    .array(
      z.object({
        id: z.string(),
        changes: z
          .array(
            z.object({
              field: z.string(),
              value: z.object({
                messaging_product: z.string().optional(),
                metadata: z.object({ phone_number_id: z.string() }).optional(),
                contacts: z
                  .array(
                    z.object({
                      wa_id: z.string(),
                      profile: z
                        .object({ name: z.string().max(200) })
                        .optional(),
                    }),
                  )
                  .max(50)
                  .optional(),
                messages: z.array(message).max(50).optional(),
                statuses: z.array(status).max(50).optional(),
              }),
            }),
          )
          .max(20),
      }),
    )
    .max(10),
});
export async function matchingContext(tx: Tx, phone: string) {
  const customers = await tx.customer.findMany({
    where: { phone, deletedAt: null },
    select: { id: true },
    take: 2,
  });
  const leads = await tx.lead.findMany({
    where: { phone, deletedAt: null },
    select: {
      id: true,
      customerId: true,
      agentId: true,
      projectId: true,
      unitId: true,
    },
    take: 2,
  });
  const customerId = customers.length === 1 ? customers[0].id : null;
  const lead =
    leads.length === 1 &&
    (!leads[0].customerId || leads[0].customerId === customerId)
      ? leads[0]
      : null;
  const visits = lead
    ? await tx.siteVisit.findMany({
        where: { leadId: lead.id, phone },
        select: { id: true },
        take: 2,
      })
    : [];
  const enquiries = lead
    ? await tx.enquiry.findMany({
        where: { leadId: lead.id, phone },
        select: { id: true },
        take: 2,
      })
    : [];
  return {
    customerId,
    leadId: lead?.id || null,
    agentId: lead?.agentId || null,
    projectId: lead?.projectId || null,
    unitId: lead?.unitId || null,
    visitId: visits.length === 1 ? visits[0].id : null,
    enquiryId: enquiries.length === 1 ? enquiries[0].id : null,
  };
}
export async function applyReceipt(tx: Tx, eventId: string) {
  const event = await tx.whatsAppWebhookEvent.findUniqueOrThrow({
    where: { id: eventId },
  });
  if (!event.status || event.applied) return;
  const row = await tx.whatsAppMessage.findFirst({
    where: {
      direction: 'OUTBOUND',
      recipient: event.recipient || '',
      conversation: { phoneNumberId: event.phoneNumberId },
      OR: [
        { providerMessageId: event.providerMessageId },
        ...(event.callbackId
          ? [{ id: event.callbackId, providerMessageId: null }]
          : []),
      ],
    },
  });
  if (!row) return;
  const existing = await tx.whatsAppStatusHistory.createMany({
    data: [
      {
        messageId: row.id,
        status: event.status,
        occurredAt: event.occurredAt,
        eventKey: event.id,
      },
    ],
    skipDuplicates: true,
  });
  if (existing.count)
    await tx.whatsAppMessage.update({
      where: { id: row.id },
      data: {
        providerMessageId: event.providerMessageId,
        status: nextStatus(row.status, event.status) as WhatsAppStatus,
        ...(event.errorCode ? { errorCode: event.errorCode } : {}),
      },
    });
  await tx.whatsAppWebhookEvent.update({
    where: { id: event.id },
    data: { applied: true },
  });
}
export async function ingestWebhook(
  payload: unknown,
  config: { phoneNumberId: string; businessAccountId: string },
) {
  const parsed = envelope.parse(payload);
  if(parsed.entry.reduce((sum,e)=>sum+e.changes.reduce((n,c)=>n+(c.value.messages?.length||0)+(c.value.statuses?.length||0),0),0)>100)throw new PublicError('Webhook event bound exceeded',413);
  let count = 0;
  for (const entry of parsed.entry)
    for (const change of entry.changes) {
      if (
        entry.id !== config.businessAccountId ||
        change.field !== 'messages' ||
        change.value.metadata?.phone_number_id !== config.phoneNumberId
      )
        continue;
      const value = change.value;
      if (
        (value.messages?.length || 0) + (value.statuses?.length || 0) + count >
        100
      )
        throw new Error('Webhook event bound exceeded');
      for (const incoming of value.messages || []) {
        let phone: string;
        try {
          phone = canonicalWhatsAppPhone(incoming.from);
        } catch {
          continue;
        }
        const key = createHash('sha256')
          .update(config.phoneNumberId + ':inbound:' + incoming.id)
          .digest('hex');
        await getDb().$transaction(
          async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${config.phoneNumberId + phone}))`;
            const created = await tx.whatsAppWebhookEvent.createMany({
              data: [
                {
                  id: key,
                  providerMessageId: incoming.id,
                  phoneNumberId: config.phoneNumberId,
                  kind: 'INBOUND',
                  occurredAt: incoming.timestamp,
                  applied: true,
                },
              ],
              skipDuplicates: true,
            });
            if (!created.count) return;
            const context = await matchingContext(tx, phone);
            const displayName = value.contacts?.find(
              (c) => c.wa_id === incoming.from,
            )?.profile?.name;
            const safeName = displayName
              ?.replace(/[\p{Cc}\p{Cf}]/gu, '')
              .slice(0, 80);
            const contact = await tx.whatsAppContact.upsert({
              where: { phone },
              create: {
                phone,
                displayName: safeName,
                customerId: context.customerId,
              },
              update: {},
            });
            const { customerId: _customerId, ...links } = context;
            let thread = await tx.whatsAppConversation.upsert({
              where: {
                contactId_phoneNumberId: {
                  contactId: contact.id,
                  phoneNumberId: config.phoneNumberId,
                },
              },
              create: {
                contactId: contact.id,
                phoneNumberId: config.phoneNumberId,
                ...links,
              },
              update: {},
            });
            const text = communicationText.safeParse(incoming.text?.body);
            const body =
              incoming.type === 'text' && text.success ? text.data : null;
            const intent = body ? inboundIntent(body) : 'MESSAGE';
            if (intent === 'OPT_OUT')
              await tx.whatsAppContact.update({
                where: { id: contact.id },
                data: {
                  consent: 'OPTED_OUT',
                  consentAt: incoming.timestamp,
                  consentSource: 'CUSTOMER_STOP',
                },
              });
            await tx.whatsAppMessage.create({
              data: {
                conversationId: thread.id,
                providerMessageId: incoming.id,
                direction: 'INBOUND',
                type: body ? 'text' : 'unsupported',
                status: 'RECEIVED',
                body,
                sender: phone,
                recipient: config.phoneNumberId,
                providerAt: incoming.timestamp,
              },
            });
            thread = await tx.whatsAppConversation.update({
              where: { id: thread.id },
              data: {
                unreadCount: { increment: 1 },
                version: { increment: 1 },
                aiDraft: null,
                aiReferences: PrismaJsonNull(),
                lastActivityAt: new Date(),
                lastInboundAt:
                  thread.lastInboundAt &&
                  thread.lastInboundAt > incoming.timestamp
                    ? thread.lastInboundAt
                    : incoming.timestamp,
                ...(intent === 'OPT_OUT'
                  ? { mode: 'PAUSED' as const, handoffAt: new Date() }
                  : intent === 'HUMAN'
                    ? { mode: 'HUMAN' as const, handoffAt: new Date() }
                    : {}),
              },
            });
            if (intent !== 'MESSAGE')
              await tx.auditLogReady.create({
                data: {
                  action:
                    intent === 'HUMAN'
                      ? 'WHATSAPP_HUMAN_REQUESTED'
                      : 'WHATSAPP_OPTED_OUT',
                  entityType: 'WhatsAppConversation',
                  entityId: thread.id,
                  metadata: { leadId: thread.leadId },
                },
              });
          },
          { maxWait: 15000, timeout: 20000 },
        );
        count++;
      }
      for (const incoming of value.statuses || []) {
        let recipient: string;
        try {
          recipient = canonicalWhatsAppPhone(incoming.recipient_id);
        } catch {
          continue;
        }
        const key = createHash('sha256')
          .update(
            [
              config.phoneNumberId,
              incoming.id,
              incoming.status,
              incoming.timestamp.toISOString(),
            ].join(':'),
          )
          .digest('hex');
        await getDb().$transaction(
          async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${config.phoneNumberId + recipient}))`;
            await tx.whatsAppWebhookEvent.createMany({
              data: [
                {
                  id: key,
                  providerMessageId: incoming.id,
                  phoneNumberId: config.phoneNumberId,
                  recipient,
                  callbackId: z
                    .uuid()
                    .safeParse(incoming.biz_opaque_callback_data).success
                    ? incoming.biz_opaque_callback_data
                    : null,
                  kind: 'STATUS',
                  status: incoming.status.toUpperCase() as WhatsAppStatus,
                  occurredAt: incoming.timestamp,
                  errorCode: incoming.errors?.[0]
                    ? 'META_' + incoming.errors[0].code
                    : null,
                },
              ],
              skipDuplicates: true,
            });
            await applyReceipt(tx, key);
          },
          { maxWait: 15000, timeout: 20000 },
        );
        count++;
      }
    }
  return { accepted: true, events: count };
}
// Runtime import stays server-side; SQL NULL clears stale model references.
import { Prisma as PrismaRuntime } from '@/generated/prisma/client';
const PrismaJsonNull = () => PrismaRuntime.DbNull;
