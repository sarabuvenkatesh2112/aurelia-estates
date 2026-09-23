import { z } from 'zod';
const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.coerce.number().min(min).max(max).optional(),
  );
const optionalText = z.string().trim().max(100).optional();
export const searchSchema = z
  .object({
    keyword: optionalText,
    city: optionalText,
    locality: optionalText,
    type: z.enum(['APARTMENT', 'VILLA', 'PENTHOUSE']).optional(),
    bhk: optionalNumber(0, 12),
    minPrice: optionalNumber(0, 1e12),
    maxPrice: optionalNumber(0, 1e12),
    minArea: optionalNumber(0, 1000000),
    maxArea: optionalNumber(0, 1000000),
    status: z
      .enum([
        'PRE_LAUNCH',
        'NEW_LAUNCH',
        'UNDER_CONSTRUCTION',
        'READY_TO_MOVE',
        'SOLD_OUT',
      ])
      .optional(),
    availability: z
      .enum(['AVAILABLE', 'HOLD', 'RESERVED', 'BOOKED', 'SOLD', 'NOT_RELEASED'])
      .optional(),
    developer: z.uuid().optional(),
    possessionBefore: z.iso.date().optional(),
    amenities: z
      .array(z.string().regex(/^[a-z0-9-]{1,100}$/))
      .max(20)
      .default([]),
    sort: z
      .enum([
        'featured',
        'newest',
        'price-asc',
        'price-desc',
        'area',
        'possession',
      ])
      .default('featured'),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(24).default(6),
  })
  .superRefine((v, ctx) => {
    if (
      v.minPrice !== undefined &&
      v.maxPrice !== undefined &&
      v.minPrice > v.maxPrice
    )
      ctx.addIssue({
        code: 'custom',
        path: ['maxPrice'],
        message: 'Maximum price must be at least the minimum.',
      });
    if (
      v.minArea !== undefined &&
      v.maxArea !== undefined &&
      v.minArea > v.maxArea
    )
      ctx.addIssue({
        code: 'custom',
        path: ['maxArea'],
        message: 'Maximum area must be at least the minimum.',
      });
  });
export type SearchFilters = z.infer<typeof searchSchema>;
export function parseSearch(params: URLSearchParams) {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of params)
    if (value && key !== 'amenities') raw[key] = value;
  raw.amenities = params
    .getAll('amenities')
    .flatMap((v) => v.split(','))
    .filter(Boolean);
  return searchSchema.parse(raw);
}
export function intentFilters(prompt: string, cities: string[]) {
  const text = prompt.toLowerCase();
  const city =
    cities.find((c) => text.includes(c.toLowerCase())) ||
    (text.includes('vizag') ? 'Visakhapatnam' : undefined);
  const beds = text.match(/(\d+(?:\.5)?)\s*(?:bhk|bed)/)?.[1];
  const amount = text.match(
    /(?:under|below|up to|budget)\s*₹?\s*([\d.]+)\s*(cr|crore|lakh|lac)/,
  );
  return searchSchema.parse({
    city,
    bhk: beds,
    maxPrice: amount
      ? Number(amount[1]) * (/lakh|lac/.test(amount[2]) ? 1e5 : 1e7)
      : undefined,
    type: text.includes('penthouse')
      ? 'PENTHOUSE'
      : text.includes('villa')
        ? 'VILLA'
        : text.includes('apartment')
          ? 'APARTMENT'
          : undefined,
    availability: 'AVAILABLE',
    pageSize: 3,
  });
}
