import 'server-only';
import { getDb } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import type { Staff } from '@/lib/admin/auth';
import { permit } from '@/lib/admin/auth';
import { currentStaff, threadFor } from './service';
import { runConcierge } from '@/lib/ai/provider';
import { limitAi } from '@/lib/ai/identity';
import { PublicError } from '@/lib/http';
import { safeText, type ToolReference } from '@/lib/ai/contracts';
import { audit } from '@/lib/admin/mutations';
// Transport-independent assistance. No staff session, CRM notes or phone identity
// is passed to model tools. A WhatsApp phone match never authenticates a customer.
export async function draftReply(
  id: string,
  session: Staff,
  runner = runConcierge,
) {
  const db = getDb();
  const leaseUntil=new Date(Date.now()+90000);
  const initial = await db.$transaction(async (tx) => {
    const staff = await currentStaff(tx, session);
    permit(staff, 'crm');
    const thread = await threadFor(tx, staff, id);
    if (thread.mode !== 'AI_ASSISTED' || thread.contact.consent === 'OPTED_OUT')
      throw new PublicError(
        'Return this conversation to AI-assisted mode before drafting.',
        409,
      );
    const claimed = await tx.whatsAppConversation.updateMany({
      where: {
        id,
        version: thread.version,
        OR: [{ aiLeaseUntil: null }, { aiLeaseUntil: { lt: new Date() } }],
      },
      data: { aiLeaseUntil: leaseUntil },
    });
    if (!claimed.count)
      throw new PublicError('A draft is already being prepared.', 409);
    return thread;
  });
  try {
    await limitAi({ customerId: null, guestHash: 'whatsapp-draft:' + id });
    const messages = await db.whatsAppMessage.findMany({
      where: {
        conversationId: id,
        body: { not: null },
        type: 'text',
        OR: [
          { direction: 'INBOUND' },
          { status: { in: ['ACCEPTED', 'SENT', 'DELIVERED', 'READ'] } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    if (!messages.some((m) => m.direction === 'INBOUND'))
      throw new PublicError('A customer message is required before drafting.');
    let text = '',
      references: ToolReference[] = [];
    await runner({
      history: messages
        .reverse()
        .map((m) => ({
          role: m.direction === 'INBOUND' ? 'user' : 'assistant',
          content: m.body!,
        })),
      preferences: initial.preferences,
      headers: new Headers(),
      context: initial.project?.slug || null,
      signal: AbortSignal.timeout(75000),
      emit: (event) => {
        const e = event as {
          type: string;
          text?: string;
          references?: ToolReference[];
        };
        if (e.type === 'text') text = e.text || '';
        if (e.type === 'references') references = e.references || [];
      },
    });
    text = safeText.parse(text);
    if (!text)
      throw new PublicError(
        'The assistant could not prepare a safe draft.',
        503,
      );
    await db.$transaction(async (tx) => {
      const staff = await currentStaff(tx, session);
      permit(staff, 'crm');
      const current = await threadFor(tx, staff, id);
      if (
        current.mode !== 'AI_ASSISTED' ||
        current.version !== initial.version ||
        current.contact.consent === 'OPTED_OUT'
      )
        throw new PublicError(
          'The conversation changed. This draft was discarded.',
          409,
        );
      const preferences =
        references.findLast((r) => r.filters)?.filters || initial.preferences;
      await tx.whatsAppConversation.update({
        where: { id, version: initial.version },
        data: {
          aiDraft: text,
          aiReferences: JSON.parse(
            JSON.stringify(references),
          ) as Prisma.InputJsonValue,
          preferences: preferences
            ? JSON.parse(JSON.stringify(preferences))
            : Prisma.DbNull,
          version: { increment: 1 },
        },
      });
      await audit(
        tx,
        staff,
        'WHATSAPP_AI_DRAFTED',
        'WhatsAppConversation',
        id,
        { toolCount: references.length },
      );
    });
    return { text, reviewRequired: true };
  } finally {
    await db.whatsAppConversation.updateMany({
      where: { id,aiLeaseUntil:leaseUntil },
      data: { aiLeaseUntil: null },
    });
  }
}
