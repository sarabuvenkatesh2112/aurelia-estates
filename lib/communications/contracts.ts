import { z } from 'zod';
import { phoneSchema } from '@/lib/validation/customer';
import { can, type StaffRole } from '@/lib/admin/policy';

export const communicationText = z
  .string()
  .max(4096)
  .transform((v) => v.normalize('NFC').trim())
  .pipe(
    z
      .string()
      .min(1)
      .max(2000)
      .refine(
        (v) =>
          !/[\p{Cc}\u202a-\u202e\u2066-\u2069]/u.test(
            v.replace(/[\n\r\t]/g,''),
          ),
        'Remove control characters.',
      ),
  ).refine(v=>!/(?:AIza[\w-]{20,}|sk-[\w-]{16,}|postgres(?:ql)?:\/\/|bearer\s+[\w.-]{12,}|(?:password|api[_ -]?key|secret|token)\s*[:=]\s*\S+)/i.test(v),'Do not include passwords, keys or connection credentials'
  );
export const modeSchema = z.enum(['AI_ASSISTED', 'HUMAN', 'PAUSED']);
export const listSchema = z
  .object({
    q: z.string().trim().max(80).default(''),
    mode: modeSchema.optional(),
    unread: z.enum(['true', 'false']).optional(),
    agentId: z.uuid().optional(),
    projectId: z.uuid().optional(),
    leadId: z.uuid().optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .strict();
export const commandSchema = z.discriminatedUnion('action', [
  z.object({action:z.literal('follow_up'),title:communicationText,dueAt:z.iso.datetime({offset:true}),notes:communicationText.optional()}).strict(),
  z
    .object({
      action: z.literal('mode'),
      version: z.number().int().min(0),
      mode: modeSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal('assign'),
      version: z.number().int().min(0),
      agentId: z.uuid().nullable(),
    })
    .strict(),
  z.object({ action: z.literal('read') }).strict(),
  z.object({ action: z.literal('draft') }).strict(),
  z
    .object({
      action: z.literal('consent'),
      version: z.number().int().min(0),
      consent: z.enum(['OPTED_IN', 'OPTED_OUT']),
      evidence: communicationText,
    })
    .strict(),
  z
    .object({
      action: z.literal('link'),
      version: z.number().int().min(0),
      leadId: z.uuid(),
      visitId: z.uuid().optional(),
      enquiryId: z.uuid().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('prepare'),
      kind: z.enum([
        'VISIT_REQUEST_RECEIVED',
        'VISIT_CONFIRMED',
        'VISIT_RESCHEDULED',
        'VISIT_CANCELLED',
        'ENQUIRY_RECEIVED',
        'PROPERTY_HANDOFF',
      ]),
    })
    .strict(),
  z
    .object({
      action: z.literal('send'),
      idempotencyKey: z.uuid(),
      text: communicationText,
      confirm: z.literal(true),
      templateId: z.string().max(100).optional(),
      parameters: z.array(z.string().trim().min(1).max(300)).max(8).optional(),
    })
    .strict(),
]);
export function canonicalWhatsAppPhone(value: string) {
  return phoneSchema.parse(/^91[6-9]\d{9}$/.test(value) ? '+' + value : value);
}
export function mayWrite(role: StaffRole) {
  return can(role, 'crm');
}
export function sameCommunicationOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const expected = new URL(request.url);
  // Next dev may expose its internal bind host in request.url. Host is the
  // browser-requested authority; never accept arbitrary forwarded origins.
  expected.host = request.headers.get('host') || expected.host;
  return origin === expected.origin;
}
export function mayAccess(
  role: StaffRole,
  staffId: string,
  assignedId: string | null,
) {
  return role !== 'SALES_AGENT' || staffId === assignedId;
}
export function serviceWindow(lastInboundAt: Date | null, now = new Date()) {
  return (
    !!lastInboundAt &&
    lastInboundAt <= now &&
    now.getTime() - lastInboundAt.getTime() < 24 * 60 * 60 * 1000
  );
}
export function inboundIntent(text: string) {
  if (/^(stop|unsubscribe|opt out|stop messages)[.!\s]*$/i.test(text.trim()))
    return 'OPT_OUT';
  if (
    /\b(talk|speak)\s+(to|with)\s+(a\s+|an\s+)?(person|human|agent|someone)\b|\bcall me\b/i.test(
      text,
    )
  )
    return 'HUMAN';
  return 'MESSAGE';
}
const rank: Record<string, number> = {
  RECEIVED: 0,
  QUEUED: 0,
  SUBMITTING: 1,
  UNCERTAIN: 2,
  ACCEPTED: 2,
  FAILED: 2,
  SENT: 3,
  DELIVERED: 4,
  READ: 5,
};
export function nextStatus(current: string, incoming: string) {
  if(current==='FAILED'&&!['DELIVERED','READ'].includes(incoming))return current;
  if(incoming==='FAILED'&&!['DELIVERED','READ'].includes(current))return 'FAILED';
  return rank[incoming] >= rank[current] ? incoming : current;
}
