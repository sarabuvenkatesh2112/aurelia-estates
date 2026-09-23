import 'server-only';
import { enquirySchema, visitSchema } from '@/lib/validation/forms';
import { saveContact } from '@/lib/repositories/leadRepository';
export const submitEnquiry = (
  input: unknown,
  customerId: string | null = null,
) => saveContact('enquiry', enquirySchema.parse(input), customerId);
export const submitVisit = (input: unknown, customerId: string | null = null) =>
  saveContact('visit', visitSchema.parse(input), customerId);
