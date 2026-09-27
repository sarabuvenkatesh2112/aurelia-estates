import 'server-only';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getDb } from '@/lib/db/prisma';
import { Prisma, type WhatsAppStatus } from '@/generated/prisma/client';
import {
  requireStaff,
  staffSelect,
  leadScope,
  permit,
  type Staff,
} from '@/lib/admin/auth';
import { audit } from '@/lib/admin/mutations';
import { PublicError } from '@/lib/http';
import { followCreate } from '@/lib/validation/admin';
import {
  commandSchema,
  listSchema,
  mayWrite,
  serviceWindow,
  canonicalWhatsAppPhone,
} from './contracts';
import { whatsappReady, whatsappConfig } from './config';
import {
  liveProvider,
  TransportError,
  type WhatsAppProvider,
} from './provider';
import { applyReceipt } from './webhook';
type Tx = Prisma.TransactionClient;
async function linkedCustomer(tx: Tx, phone: string, leadCustomerId: string | null) {
  const matches = await tx.customer.findMany({ where: { phone, deletedAt: null }, select: { id: true }, take: 2 });
  return matches.length === 1 && (!leadCustomerId || matches[0].id === leadCustomerId) ? matches[0].id : null;
}
export const threadInclude = {
  contact: {
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
    },
  },
  agent: { select: { id: true, name: true } },
  lead: {
    select: { id: true, name: true, status: true, agentId: true, phone: true },
  },
  project: { select: { id: true, name: true, slug: true } },
  unit: { select: { id: true, unitNumber: true } },
  visit: {
    select: {
      id: true,
      reference: true,
      status: true,
      preferredDate: true,
      preferredTime: true,
      scheduledDate: true,
      scheduledTime: true,
    },
  },
  enquiry: { select: { id: true, reference: true, status: true } },
} satisfies Prisma.WhatsAppConversationInclude;
export function threadScope(
  staff: Staff,
): Prisma.WhatsAppConversationWhereInput {
  return staff.role === 'SALES_AGENT'
    ? {
        agentId: staff.id,
        OR: [
          { leadId: null },
          { lead: { agentId: staff.id, deletedAt: null } },
        ],
      }
    : {};
}
export async function threadFor(tx: Tx, staff: Staff, id: string) {
  const thread = await tx.whatsAppConversation.findFirst({
    where: { id, ...threadScope(staff) },
    include: threadInclude,
  });
  if (!thread) throw new PublicError('Conversation not found.', 404);
  return thread;
}
export async function currentStaff(tx: Tx, staff: Staff) {
  const fresh = await tx.agent.findFirst({
    where: {
      id: staff.id,
      customerId: staff.customerId,
      active: true,
      customer: { deletedAt: null },
    },
    select: staffSelect,
  });
  if (!fresh) throw new PublicError('Staff access is no longer active.', 403);
  return fresh;
}
export async function communicationRead(
  raw: unknown,
  id?: string,
  incoming?: Headers,
) {
  const staff = await requireStaff(incoming);
  permit(staff, 'read');
  const q = listSchema.parse(raw),
    db = getDb();
  if (id) {
    z.uuid().parse(id);
    const thread = await threadFor(db, staff, id);
    const messages = await db.whatsAppMessage.findMany({
      where: { conversationId: id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
      skip: (q.page - 1) * 50,
      include: {
        staff: { select: { name: true } },
        history: { orderBy: { occurredAt: 'asc' } },
      },
    });
    const [total, audits, templates, agents] = await Promise.all([
      db.whatsAppMessage.count({ where: { conversationId: id } }),
      db.auditLogReady.findMany({
        where: { entityType: 'WhatsAppConversation', entityId: id },
        select: { id: true, action: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      db.whatsAppTemplate.findMany({
        where: { status: 'APPROVED', supported: true },
        take: 100,
        orderBy: { name: 'asc' },
      }),
      db.agent.findMany({
        where: {
          active: true,
          role: { not: 'VIEWER' },
          customerId: { not: null },
        },
        select: { id: true, name: true },
        take: 100,
      }),
    ]);
    return {
      thread,
      messages: messages.reverse(),
      total,
      page: q.page,
      audits,
      templates,
      agents,
      ready: whatsappReady(),
      windowOpen: serviceWindow(thread.lastInboundAt),
    };
  }
  const where: Prisma.WhatsAppConversationWhereInput = {
    AND: [
      threadScope(staff),
      {
        ...(q.mode ? { mode: q.mode } : {}),
        ...(q.unread === 'true' ? { unreadCount: { gt: 0 } } : {}),
        ...(q.agentId ? { agentId: q.agentId } : {}),
        ...(q.projectId ? { projectId: q.projectId } : {}),
        ...(q.leadId ? { leadId: q.leadId } : {}),
        ...(q.q
          ? {
              OR: [
                { contact: { phone: { contains: q.q } } },
                {
                  contact: {
                    displayName: { contains: q.q, mode: 'insensitive' },
                  },
                },
                {
                  contact: {
                    customer: { name: { contains: q.q, mode: 'insensitive' } },
                  },
                },
                { lead: { name: { contains: q.q, mode: 'insensitive' } } },
                { project: { name: { contains: q.q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
    ],
  };
  const [items, total, inbound, outbound, handoffs] = await Promise.all([
    db.whatsAppConversation.findMany({
      where,
      include: {
        ...threadInclude,
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { body: true, direction: true, status: true, type: true },
        },
      },
      orderBy: [{ lastActivityAt: 'desc' }, { id: 'desc' }],
      take: 20,
      skip: (q.page - 1) * 20,
    }),
    db.whatsAppConversation.count({ where }),
    db.whatsAppMessage.count({
      where: { direction: 'INBOUND', conversation: where },
    }),
    db.whatsAppMessage.count({
      where: { direction: 'OUTBOUND', conversation: where },
    }),
    db.whatsAppConversation.count({
      where: { AND: [where, { handoffAt: { not: null } }] },
    }),
  ]);
  return {
    items,
    total,
    page: q.page,
    ready: whatsappReady(),
    metrics: { inbound, outbound, handoffs },
  };
}
export async function communicationCreate(raw: unknown, incoming?: Headers) {
  const input = z
    .object({
      leadId: z.uuid(),
      visitId: z.uuid().optional(),
      enquiryId: z.uuid().optional(),
    })
    .strict()
    .parse(raw);
  const session = await requireStaff(incoming),
    phoneNumberId = whatsappConfig().phoneNumberId;
  if (!/^\d+$/.test(phoneNumberId))
    throw new PublicError(
      'Configure the WhatsApp business number before opening an outbound thread.',
      503,
    );
  return getDb().$transaction(
    async (tx) => {
      const staff = await currentStaff(tx, session);
      permit(staff, 'crm');
      const lead = await tx.lead.findFirst({
        where: { id: input.leadId, ...leadScope(staff) },
      });
      if (!lead) throw new PublicError('Lead not found.', 404);
      const phone = canonicalWhatsAppPhone(lead.phone);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${phoneNumberId + phone}))`;
      const contact = await tx.whatsAppContact.upsert({
        where: { phone },
        create: { phone, displayName: lead.name, customerId: await linkedCustomer(tx, phone, lead.customerId) },
        update: {},
      });
      const existing = await tx.whatsAppConversation.findUnique({
        where: {
          contactId_phoneNumberId: { contactId: contact.id, phoneNumberId },
        },
      });
      if (existing) {
        await threadFor(tx, staff, existing.id);
        return { id: existing.id };
      }
      if (
        input.visitId &&
        !(await tx.siteVisit.findFirst({
          where: { id: input.visitId, leadId: lead.id, phone },
        }))
      )
        throw new PublicError('Visit does not match this contact.');
      if (
        input.enquiryId &&
        !(await tx.enquiry.findFirst({
          where: { id: input.enquiryId, leadId: lead.id, phone },
        }))
      )
        throw new PublicError('Enquiry does not match this contact.');
      const row = await tx.whatsAppConversation.create({
        data: {
          contactId: contact.id,
          phoneNumberId,
          leadId: lead.id,
          agentId: lead.agentId,
          projectId: lead.projectId,
          unitId: lead.unitId,
          visitId: input.visitId,
          enquiryId: input.enquiryId,
        },
      });
      await audit(
        tx,
        staff,
        'WHATSAPP_THREAD_OPENED',
        'WhatsAppConversation',
        row.id,
        { leadId: lead.id },
      );
      return { id: row.id };
    },
    { maxWait: 15000, timeout: 20000 },
  );
}
export function preparedText(
  thread: Awaited<ReturnType<typeof threadFor>>,
  kind: string,
) {
  const project = thread.project?.name || 'your residence',
    visit = thread.visit;
  if (kind === 'PROPERTY_HANDOFF') {
    if (!thread.project?.slug) throw new PublicError('Link a project through CRM first.');
    return `Explore ${project} on Aurelia: ${(process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')}/residences/${thread.project?.slug || ''}/ . Use Schedule a visit or Make an enquiry and review your details before submitting. A submitted visit is a request, not a confirmed appointment.`;
  }
  if (kind === 'ENQUIRY_RECEIVED') {
    if (!thread.enquiry?.reference)
      throw new PublicError('Link an enquiry first.');
    return `Aurelia has received your enquiry for ${project}. Reference: ${thread.enquiry.reference}. Our team will respond personally.`;
  }
  if (!visit?.reference) throw new PublicError('Link a visit first.');
  const expected: Record<string, string> = {
    VISIT_REQUEST_RECEIVED: 'REQUESTED',
    VISIT_CONFIRMED: 'CONFIRMED',
    VISIT_RESCHEDULED: 'RESCHEDULED',
    VISIT_CANCELLED: 'CANCELLED',
  };
  if (visit.status !== expected[kind])
    throw new PublicError(
      'This notification does not match the current visit status.',
      409,
    );
  if (kind === 'VISIT_CANCELLED')
    return `Your Aurelia visit request for ${project}, reference ${visit.reference}, is cancelled. Contact us when you would like to plan another visit.`;
  const date = (visit.scheduledDate || visit.preferredDate)
      .toISOString()
      .slice(0, 10),
    time = visit.scheduledTime || visit.preferredTime;
  return kind === 'VISIT_REQUEST_RECEIVED'
    ? `Request received for ${project}: ${date}, ${time} IST. Reference: ${visit.reference}. This is not an appointment confirmation. Our team will contact you.`
    : `Your visit to ${project} is ${kind === 'VISIT_CONFIRMED' ? 'confirmed' : 'rescheduled'} for ${date}, ${time} IST. Reference: ${visit.reference}.`;
}
export async function communicationCommand(
  id: string,
  raw: unknown,
  incoming?: Headers,
  transport?: WhatsAppProvider,
) {
  z.uuid().parse(id);
  const input = commandSchema.parse(raw),
    session = await requireStaff(incoming);
  if (!mayWrite(session.role))
    throw new PublicError('Your role is read-only.', 403);
  if (input.action === 'send')
    return sendMessage(id, input, session, transport);
  if (input.action === 'draft') {
    const { draftReply } = await import('./draft');
    return draftReply(id, session);
  }
  return getDb().$transaction(
    async (tx) => {
      const staff = await currentStaff(tx, session);
      permit(staff, 'crm');
      const t = await threadFor(tx, staff, id);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${t.phoneNumberId + t.contact.phone}))`;
      const thread = await threadFor(tx, staff, id);
      if ('version' in input && thread.version !== input.version)
        throw new PublicError(
          'Conversation changed. Refresh before saving.',
          409,
        );
      if (input.action === 'prepare')
        return { text: preparedText(thread, input.kind) };
      if(input.action==='follow_up') {
        if(!thread.leadId)throw new PublicError('Link a lead before planning a follow-up.');
        const fields=followCreate.parse({leadId:thread.leadId,agentId:thread.agentId||staff.id,title:input.title,dueAt:input.dueAt,notes:input.notes});
        const dueAt=new Date(fields.dueAt);if(dueAt<=new Date())throw new PublicError('Choose a future follow-up time.');
        if (!(await tx.agent.findFirst({where:{id:fields.agentId,active:true,role:{not:'VIEWER'},customer:{deletedAt:null}}}))) throw new PublicError('Assign active staff before creating a follow-up.');
        const existing=await tx.followUp.findFirst({where:{leadId:fields.leadId,agentId:fields.agentId,title:fields.title,dueAt,status:'PENDING'}});
        if(existing)return {id:existing.id};
        const follow=await tx.followUp.create({data:{...fields,dueAt}});
        await audit(tx,staff,'WHATSAPP_FOLLOW_UP_CREATED','WhatsAppConversation',id,{followUpId:follow.id,leadId:thread.leadId});return {id:follow.id};
      }
      if (input.action === 'read') {
        await tx.whatsAppConversation.update({
          where: { id },
          data: { unreadCount: 0 },
        });
        return { ok: true };
      }
      const data: Prisma.WhatsAppConversationUpdateInput = {
        version: { increment: 1 },
      };
      if (input.action === 'mode') {
        data.mode = input.mode;
        data.aiDraft = null;
        data.aiReferences = Prisma.DbNull;
      }
      if (input.action === 'assign') {
        permit(staff, 'assign');
        if (
          input.agentId &&
          !(await tx.agent.findFirst({
            where: {
              id: input.agentId,
              active: true,
              role: { not: 'VIEWER' },
              customer: { deletedAt: null },
            },
          }))
        )
          throw new PublicError('Choose active eligible staff.');
        if (thread.lead && thread.lead.agentId !== input.agentId)
          throw new PublicError(
            'Assign the linked lead in CRM first so access remains consistent.',
            409,
          );
        data.agent = input.agentId
          ? { connect: { id: input.agentId } }
          : { disconnect: true };
      }
      if (input.action === 'consent') {
        await tx.whatsAppContact.update({
          where: { id: thread.contactId },
          data: {
            consent: input.consent,
            consentAt: new Date(),
            consentSource: input.evidence,
          },
        });
        if (input.consent === 'OPTED_OUT') {
          data.mode = 'PAUSED';
          data.aiDraft = null;
        }
      }
      if (input.action === 'link') {
        const lead = await tx.lead.findFirst({
          where: {
            id: input.leadId,
            ...leadScope(staff),
            phone: thread.contact.phone,
          },
        });
        if (!lead)
          throw new PublicError(
            'Choose a permitted lead with the exact contact phone.',
            404,
          );
        if (
          input.visitId &&
          !(await tx.siteVisit.findFirst({
            where: {
              id: input.visitId,
              leadId: lead.id,
              phone: thread.contact.phone,
            },
          }))
        )
          throw new PublicError('Visit does not match.');
        if (
          input.enquiryId &&
          !(await tx.enquiry.findFirst({
            where: {
              id: input.enquiryId,
              leadId: lead.id,
              phone: thread.contact.phone,
            },
          }))
        )
          throw new PublicError('Enquiry does not match.');
        data.lead = { connect: { id: lead.id } };
        await tx.whatsAppContact.update({where:{id:thread.contactId},data:{customerId:await linkedCustomer(tx,thread.contact.phone,lead.customerId)}});
        data.project = { connect: { id: lead.projectId } };
        data.agent = lead.agentId
          ? { connect: { id: lead.agentId } }
          : { disconnect: true };
        data.unit = lead.unitId
          ? { connect: { id: lead.unitId } }
          : { disconnect: true };
        data.visit = input.visitId
          ? { connect: { id: input.visitId } }
          : { disconnect: true };
        data.enquiry = input.enquiryId
          ? { connect: { id: input.enquiryId } }
          : { disconnect: true };
      }
      await tx.whatsAppConversation.update({ where: { id }, data });
      await audit(
        tx,
        staff,
        'WHATSAPP_' + input.action.toUpperCase(),
        'WhatsAppConversation',
        id,
        { leadId: thread.leadId },
      );
      return { ok: true };
    },
    { maxWait: 15000, timeout: 20000 },
  );
}
type SendCommand = Extract<z.infer<typeof commandSchema>, { action: 'send' }>;
async function sendMessage(
  id: string,
  input: SendCommand,
  session: Staff,
  transport?: WhatsAppProvider,
) {
  await threadFor(getDb(),session,id);
  const provider = transport || liveProvider(); // Tests inject transport in-process only; never via HTTP.
  const hash = createHash('sha256')
    .update(
      JSON.stringify({
        id,
        text: input.text,
        templateId: input.templateId,
        parameters: input.parameters,
      }),
    )
    .digest('hex');
  const reserved = await getDb().$transaction(
    async (tx) => {
      const staff = await currentStaff(tx, session);
      permit(staff, 'crm');
      const before = await threadFor(tx, staff, id);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'whatsapp-send-staff:' + staff.id}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${before.phoneNumberId + before.contact.phone}))`;
      const thread = await threadFor(tx, staff, id);
      const prior = await tx.whatsAppMessage.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (prior) {
        if (prior.conversationId !== id || prior.payloadHash !== hash)
          throw new PublicError('Request key already used.', 409);
        return { existing: prior };
      }
      if (thread.mode === 'PAUSED' || thread.contact.consent === 'OPTED_OUT')
        throw new PublicError('This contact is paused or opted out.', 409);
      if (!transport && thread.phoneNumberId !== whatsappConfig().phoneNumberId)
        throw new PublicError('Business number configuration changed.', 409);
      const recent = await tx.whatsAppMessage.count({
        where: {
          direction: 'OUTBOUND',
          conversationId: id,
          createdAt: { gte: new Date(Date.now() - 60000) },
        },
      });
      const staffRecent = await tx.whatsAppMessage.count({
        where: {
          staffId: staff.id,
          direction: 'OUTBOUND',
          createdAt: { gte: new Date(Date.now() - 3600000) },
        },
      });
      if (recent >= 5 || staffRecent >= 60)
        throw new PublicError('Messaging limit reached. Please wait.', 429);
      let template;
      if (input.templateId) {
        template = await tx.whatsAppTemplate.findFirst({
          where: {
            id: input.templateId,
            status: 'APPROVED',
            supported: true,
            category: 'UTILITY',
            syncedAt: { gte: new Date(Date.now() - 3600000) },
          },
        });
        if (!template)
          throw new PublicError(
            'Refresh Meta template approval before sending.',
            409,
          );
        if (thread.contact.consent !== 'OPTED_IN')
          throw new PublicError(
            'Recorded WhatsApp opt-in is required for template messaging.',
            409,
          );
        if (template.parameterCount !== (input.parameters?.length || 0))
          throw new PublicError('Template parameters do not match.');
        const rendered = template.body.replace(
          /\{\{(\d+)\}\}/g,
          (_m, n) => input.parameters![Number(n) - 1],
        );
        if (rendered !== input.text)
          throw new PublicError(
            'Review the exact approved template text before sending.',
            409,
          );
      } else if (!serviceWindow(thread.lastInboundAt))
        throw new PublicError(
          'The service window is closed. Use an approved utility template with recorded opt-in.',
          409,
        );
      const row = await tx.whatsAppMessage.create({
        data: {
          conversationId: id,
          idempotencyKey: input.idempotencyKey,
          payloadHash: hash,
          direction: 'OUTBOUND',
          type: template ? 'template' : 'text',
          status: 'SUBMITTING',
          body: input.text,
          sender: thread.phoneNumberId,
          recipient: thread.contact.phone,
          staffId: staff.id,
          attempts: 1,
          templateName: template?.name,
          templateLanguage: template?.language,
          templateParameters: input.parameters,
        },
      });
      await tx.whatsAppStatusHistory.create({
        data: {
          messageId: row.id,
          status: 'SUBMITTING',
          eventKey: 'submit:' + row.id,
          occurredAt: new Date(),
        },
      });
      await audit(
        tx,
        staff,
        'WHATSAPP_SEND_INITIATED',
        'WhatsAppConversation',
        id,
        { messageId: row.id, leadId: thread.leadId, type: row.type },
      );
      return { row, template };
    },
    { maxWait: 15000, timeout: 20000 },
  );
  if (reserved.existing)
    return { id: reserved.existing.id, status: reserved.existing.status };
  const { row, template } = reserved;
  let providerId: string | undefined, failed: TransportError | undefined;
  try {
    providerId = (
      await provider.send({
        to: row.recipient,
        correlationId: row.id,
        text: input.text,
        ...(template
          ? {
              template: {
                name: template.name,
                language: template.language,
                parameters: input.parameters || [],
              },
            }
          : {}),
      })
    ).id;
  } catch (e) {
    failed =
      e instanceof TransportError
        ? e
        : new TransportError('TRANSPORT_UNCERTAIN', true);
  }
  await getDb().$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${row.sender + row.recipient}))`;
      const latest = await tx.whatsAppMessage.findUniqueOrThrow({
        where: { id: row.id },
      });
      const status: WhatsAppStatus = failed
        ? failed.uncertain
          ? 'UNCERTAIN'
          : 'FAILED'
        : 'ACCEPTED';
      // Delivery webhooks may beat the HTTP response; never regress their state.
      if (['SUBMITTING', 'QUEUED', 'UNCERTAIN'].includes(latest.status))
        await tx.whatsAppMessage.update({
          where: { id: row.id },
          data: {
            status,
            providerMessageId: providerId,
            errorCode: failed?.code,
          },
        });
      await tx.whatsAppStatusHistory.create({
        data: {
          messageId: row.id,
          status,
          eventKey: 'result:' + row.id,
          occurredAt: new Date(),
        },
      });
      if (providerId) {
        const receipts = await tx.whatsAppWebhookEvent.findMany({
          where: { providerMessageId: providerId, applied: false },
          take: 50,
        });
        for (const receipt of receipts) await applyReceipt(tx, receipt.id);
      }
      await tx.whatsAppConversation.update({
        where: { id },
        data: { lastActivityAt: new Date(), version: { increment: 1 } },
      });
    },
    { maxWait: 15000, timeout: 20000 },
  );
  return getDb().whatsAppMessage.findUniqueOrThrow({
    where: { id: row.id },
    select: { id: true, status: true, errorCode: true },
  });
}
export async function syncTemplates(
  incoming?: Headers,
  transport?: WhatsAppProvider,
) {
  const staff = await requireStaff(incoming);
  permit(staff, 'assign');
  const templates = await (transport || liveProvider()).templates();
  await getDb().$transaction(
    async (tx) => {
      permit(await currentStaff(tx, staff),'assign');
      await tx.whatsAppTemplate.updateMany({ data: { status: 'STALE' } });
      for (const t of templates)
        await tx.whatsAppTemplate.upsert({
          where: { id: t.id },
          create: t,
          update: { ...t, syncedAt: new Date() },
        });
      await audit(
        tx,
        staff,
        'WHATSAPP_TEMPLATES_SYNCED',
        'WhatsAppConfiguration',
        'templates',
        { count: templates.length },
      );
    },
    { timeout: 20000 },
  );
  return { count: templates.length };
}
