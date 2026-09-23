import { z } from 'zod';
import { nameSchema, emailSchema, phoneSchema, notesSchema } from './customer';
export const VISIT_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
] as const;
export const VISIT_TIME_ZONE = 'Asia/Kolkata';
export function indiaDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VISIT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function slotAvailable(date: string, slot: string, now = new Date()) {
  return new Date(date + 'T' + slot + ':00+05:30').getTime() > now.getTime();
}
export const visitDateSchema = z.iso
  .date('Choose a valid visit date.')
  .refine((v) => {
    const today = indiaDate();
    const last = new Date(today + 'T00:00:00Z');
    last.setUTCFullYear(last.getUTCFullYear() + 1);
    return v >= today && v <= last.toISOString().slice(0, 10);
  }, 'Choose today or a future date within the next year.');
export const contactSchema = z.object({
  idempotencyKey: z.uuid(),
  projectId: z.uuid(),
  unitId: z.uuid().optional(),
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  message: notesSchema,
  website: z.string().max(0).optional(),
});
export const enquirySchema = contactSchema.strict();
export const visitSchema = contactSchema
  .extend({
    configurationId: z.uuid().optional(),
    preferredDate: visitDateSchema,
    preferredTime: z.enum(VISIT_SLOTS, {
      error: 'Choose an available time slot.',
    }),
    guestCount: z.coerce.number().int().min(1).max(10),
  })
  .strict()
  .refine((v) => slotAvailable(v.preferredDate, v.preferredTime), {
    path: ['preferredTime'],
    message: 'That time has passed. Choose a later visit slot.',
  });
export type EnquiryInput = z.infer<typeof enquirySchema>;
export type VisitInput = z.infer<typeof visitSchema>;
export const LEAD_WINDOW_DAYS = 30;
export const normalizedPhone = (phone: string) => phoneSchema.parse(phone);
