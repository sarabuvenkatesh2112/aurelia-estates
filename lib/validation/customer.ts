import { z } from 'zod';
import { searchSchema } from './search';
export const nameSchema = z
  .string()
  .max(200)
  .refine(
    (v) => !/[\p{Cc}\p{Cf}]/u.test(v),
    'Use letters, spaces, apostrophes or hyphens.',
  )
  .transform((v) => v.normalize('NFC').trim().replace(/ +/g, ' '))
  .pipe(
    z
      .string()
      .min(2, 'Enter your full name (2–60 characters).')
      .max(60, 'Keep your name within 60 characters.')
      .regex(
        /^[\p{L}\p{M} .’'-]+$/u,
        'Use letters, spaces, apostrophes or hyphens.',
      )
      .refine((v) => /\p{L}/u.test(v), 'Enter your full name.'),
  );
export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .regex(
    /^(?:\+91[ -]?)?[6-9][0-9 -]*$/,
    'Enter a valid 10-digit Indian mobile number.',
  )
  .transform((v) => v.replace(/[ -]/g, '').replace(/^\+91/, ''))
  .pipe(
    z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.')
      .refine(
        (v) => !/^(\d)\1{9}$/.test(v),
        'Enter a valid 10-digit Indian mobile number.',
      ),
  )
  .transform((v) => '+91' + v);
export const emailSchema = z
  .string()
  .trim()
  .max(254, 'Enter a valid email address.')
  .transform((v) => v.toLowerCase())
  .pipe(z.email('Enter a valid email address.'));
export const passwordRules = [
  {
    label: '8–128 characters',
    check: (v: string) => v.length >= 8 && v.length <= 128,
  },
  { label: 'Uppercase letter', check: (v: string) => /\p{Lu}/u.test(v) },
  { label: 'Lowercase letter', check: (v: string) => /\p{Ll}/u.test(v) },
  { label: 'Number', check: (v: string) => /[0-9]/.test(v) },
  {
    label: 'Special character',
    check: (v: string) => /[^\p{L}\p{N}\s]/u.test(v),
  },
];
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'Use no more than 128 characters.')
  .superRefine((v, ctx) => {
    for (const rule of passwordRules)
      if (!rule.check(v))
        ctx.addIssue({ code: 'custom', message: rule.label + ' required.' });
  });
export const notesSchema = z
  .string()
  .trim()
  .max(500, 'Keep your note within 500 characters.')
  .refine(
    (v) =>
      !/[<>]|javascript\s*:/i.test(v) &&
      !/\p{Cc}/u.test(v.replace(/[\n\r\t]/g, '')),
    'Use plain text without scripts or HTML.',
  )
  .default('');
export const profileSchema = z
  .object({ name: nameSchema, phone: phoneSchema })
  .strict();
export const signUpSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    terms: z.literal(true, {
      error: 'Please acknowledge the Terms and Privacy notice.',
    }),
  })
  .strict()
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match exactly.',
  });
export const signInSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Enter your password.').max(128),
  })
  .strict();
export const savedSearchSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(60)
      .refine((v) => !/[<>\p{Cc}]/u.test(v), 'Use a plain-text search name.'),
    filters: searchSchema,
  })
  .strict();
export function safeReturnPath(value: unknown) {
  return typeof value === 'string' &&
    /^\/(?![/\\])/.test(value) &&
    !/[\\\p{Cc}]/u.test(value) &&
    value.length <= 2000
    ? value
    : '/account';
}
