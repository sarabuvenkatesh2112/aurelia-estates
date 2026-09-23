import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { contactCustomer } from '@/lib/auth/server';
import { PublicError } from '@/lib/http';
import { getDb } from '@/lib/db/prisma';

export const guestCookie = 'aurelia.concierge';
export type AiIdentity = {
  customerId: string | null;
  guestHash: string;
  cookie?: string;
};
export async function aiIdentity(headers: Headers): Promise<AiIdentity> {
  const customer = await contactCustomer(headers);
  const raw = headers
    .get('cookie')
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(guestCookie + '='))
    ?.slice(guestCookie.length + 1);
  const valid = raw && /^[a-f0-9]{64}$/.test(raw);
  const token = valid ? raw : randomBytes(32).toString('hex');
  return {
    customerId: customer?.id || null,
    guestHash: createHash('sha256').update(token).digest('hex'),
    ...(!valid ? { cookie: token } : {}),
  };
}
export function ownerWhere(identity: AiIdentity) {
  return {
    deletedAt: null,
    ...(identity.customerId
      ? { customerId: identity.customerId }
      : { customerId: null, guestHash: identity.guestHash }),
  };
}
export async function ownedConversation(id: string, identity: AiIdentity) {
  const row = await getDb().aiConversationReady.findFirst({
    where: { id, ...ownerWhere(identity) },
  });
  if (!row) throw new PublicError('Conversation not found.', 404);
  return row;
}
export async function limitAi(identity: AiIdentity) {
  const principal = createHash('sha256')
    .update(identity.customerId || identity.guestHash)
    .digest('hex');
  const result = await getDb().$queryRaw<
    { count: number }[]
  >`INSERT INTO "AiUsageWindow" ("principal", "startedAt", "count") VALUES (${principal}, NOW(), 1)
    ON CONFLICT ("principal") DO UPDATE SET "count" = CASE WHEN "AiUsageWindow"."startedAt" < NOW() - INTERVAL '1 hour' THEN 1 ELSE "AiUsageWindow"."count" + 1 END,
    "startedAt" = CASE WHEN "AiUsageWindow"."startedAt" < NOW() - INTERVAL '1 hour' THEN NOW() ELSE "AiUsageWindow"."startedAt" END RETURNING "count"`;
  if (result[0].count > 30)
    throw new PublicError(
      'Your concierge is taking a short pause. Please try again later.',
      429,
    );
}
