import { z } from 'zod';
import { nameSchema, emailSchema, phoneSchema } from './customer';
import { visitDateSchema, VISIT_SLOTS, slotAvailable } from './forms';
import { staffRoles, leadStages } from '@/lib/admin/policy';
export const crmText = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (v) =>
      !/[<>\p{Cf}]/u.test(v) && !Array.from(v).some(c => c.charCodeAt(0) < 32 && !'\t\n\r'.includes(c)) &&
      !/javascript:/i.test(v),
    'Use plain text without unsafe markup.',
  );
const title = crmText.pipe(z.string().min(2).max(100));
export const money = z.coerce.number().min(0).max(100_000_000_000);
const uuid = z.uuid();
const version = z.number().int().nonnegative();
export const adminQuery = z
  .object({
    q: z.string().trim().max(100).default(''),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    status: z.string().max(30).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    agentId: uuid.optional(),
    projectId: uuid.optional(),
    towerId: uuid.optional(),
    floorId: uuid.optional(),
    unitTypeId: uuid.optional(),
    sourceId: uuid.optional(),
    minPrice: money.optional(),
    maxPrice: money.optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    followUp: z.enum(['today', 'overdue', 'upcoming']).optional(),
    sort: z
      .enum(['newest', 'oldest', 'price-asc', 'price-desc'])
      .default('newest'),
    days: z.coerce
      .number()
      .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)]))
      .default(30),
  })
  .strict()
  .refine(
    (v) =>
      v.minPrice === undefined ||
      v.maxPrice === undefined ||
      v.minPrice <= v.maxPrice,
    'Minimum price cannot exceed maximum.',
  )
  .refine(
    (v) =>
      !v.from ||
      !v.to ||
      (v.from <= v.to &&
        Date.parse(v.to) - Date.parse(v.from) <= 366 * 86400000),
    'Use an ordered range of at most 366 days.',
  );
export type AdminQuery = z.infer<typeof adminQuery>;
export const leadCreate = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    projectId: uuid,
    unitId: uuid.optional(),
    customerId: uuid.optional(),
    sourceId: uuid,
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    budgetMin: money.optional(),
    budgetMax: money.optional(),
    notes: crmText.optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.budgetMin === undefined ||
      v.budgetMax === undefined ||
      v.budgetMin <= v.budgetMax,
    'Minimum budget cannot exceed maximum.',
  );
export const leadEdit = z
  .object({
    version,
    status: z.enum(leadStages).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    agentId: uuid.nullable().optional(),
    budgetMin: money.nullable().optional(),
    budgetMax: money.nullable().optional(),
  })
  .strict();
export const noteCreate = z
  .object({ leadId: uuid, text: crmText.pipe(z.string().min(1)) })
  .strict();
export const followCreate = z
  .object({
    leadId: uuid,
    agentId: uuid,
    title,
    dueAt: z.iso.datetime({ offset: true }),
    notes: crmText.optional(),
  })
  .strict();
export const followEdit = z
  .object({ version, status: z.enum(['COMPLETED', 'CANCELLED']) })
  .strict();
export const enquiryEdit = z
  .object({
    version,
    status: z.enum(['NEW', 'IN_REVIEW', 'CONTACTED', 'CLOSED']),
    leadId: uuid.optional(),
  })
  .strict();
export const visitEdit = z
  .object({
    version,
    status: z.enum([
      'CONFIRMED',
      'RESCHEDULED',
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW',
    ]),
    scheduledDate: visitDateSchema.optional(),
    scheduledTime: z.enum(VISIT_SLOTS).optional(),
    note: crmText.optional(),
  })
  .strict()
  .superRefine((v, c) => {
    if (
      ['CONFIRMED', 'RESCHEDULED'].includes(v.status) &&
      (!v.scheduledDate ||
        !v.scheduledTime ||
        !slotAvailable(v.scheduledDate, v.scheduledTime))
    )
      c.addIssue({
        code: 'custom',
        path: ['scheduledDate'],
        message: 'Choose a valid future date and time in IST.',
      });
    if (
      !['CONFIRMED', 'RESCHEDULED'].includes(v.status) &&
      (v.scheduledDate || v.scheduledTime)
    )
      c.addIssue({
        code: 'custom',
        message:
          'Scheduling fields are only accepted when confirming or rescheduling.',
      });
  });
export const unitEdit = z
  .object({
    version,
    projectId: uuid,
    availability: z
      .enum(['AVAILABLE', 'HOLD', 'RESERVED', 'BOOKED', 'SOLD', 'NOT_RELEASED'])
      .optional(),
    currentPrice: money.optional(),
    reason: crmText.pipe(z.string().min(3)),
  })
  .strict();
export const staffCreate = z
  .object({ customerId: uuid, role: z.enum(staffRoles) })
  .strict();
export const staffEdit = z
  .object({ version, role: z.enum(staffRoles), active: z.boolean() })
  .strict();
