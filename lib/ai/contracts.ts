import { z } from 'zod';

export const safeText = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine(
    (v) =>
      !/\p{Cc}|<[^>]*>/u.test(v.replace(/[\n\r\t]/g, '')) &&
      !/(?:AIza[\w-]{20,}|sk-[\w-]{16,}|postgres(?:ql)?:\/\/|bearer\s+[\w.-]{12,}|(?:password|api[_ -]?key|secret|token)\s*[:=]\s*\S+)/i.test(
        v,
      ),
    'Use plain text. Do not include passwords, connection strings or secret keys.',
  );
export const filtersSchema = z
  .object({
    city: z.string().trim().max(100).nullable(),
    locality: z.string().trim().max(100).nullable(),
    project: z.string().trim().max(100).nullable(),
    type: z.enum(['APARTMENT', 'VILLA', 'PENTHOUSE']).nullable(),
    bhk: z.number().min(0).max(12).nullable(),
    minPrice: z.number().min(0).max(1e12).nullable(),
    maxPrice: z.number().min(0).max(1e12).nullable(),
    minArea: z.number().int().min(0).max(1e6).nullable(),
    maxArea: z.number().int().min(0).max(1e6).nullable(),
    amenities: z.array(z.string().regex(/^[a-z0-9-]{1,60}$/)).max(12),
    availability: z
      .enum(['AVAILABLE', 'HOLD', 'RESERVED', 'BOOKED', 'SOLD'])
      .nullable(),
    tower: z.string().trim().max(60).nullable(),
    floor: z.number().int().min(-10).max(200).nullable(),
    possessionBefore: z.iso.date().nullable(),
  })
  .strict()
  .refine(
    (v) =>
      (v.minPrice === null ||
        v.maxPrice === null ||
        v.minPrice <= v.maxPrice) &&
      (v.minArea === null || v.maxArea === null || v.minArea <= v.maxArea),
    'Minimum must not exceed maximum.',
  );
export type AiFilters = z.infer<typeof filtersSchema>;
export function mergeHardPreferences(
  next: AiFilters,
  previous: unknown,
): AiFilters {
  const saved = filtersSchema.safeParse(previous);
  if (!saved.success) return filtersSchema.parse(next);
  return filtersSchema.parse(
    Object.fromEntries(
      Object.entries(next).map(([key, value]) => [
        key,
        value === null ||
        (key === 'amenities' && Array.isArray(value) && !value.length)
          ? saved.data[key as keyof AiFilters]
          : value,
      ]),
    ),
  );
}
export const emptyFilters: AiFilters = {
  city: null,
  locality: null,
  project: null,
  type: null,
  bhk: null,
  minPrice: null,
  maxPrice: null,
  minArea: null,
  maxArea: null,
  amenities: [],
  availability: null,
  tower: null,
  floor: null,
  possessionBefore: null,
};
export const toolSchemas = {
  search_residences: z.object({ filters: filtersSchema }).strict(),
  project_details: z
    .object({ slug: z.string().regex(/^[a-z0-9-]{1,100}$/) })
    .strict(),
  compare_units: z.object({ ids: z.array(z.uuid()).min(2).max(4) }).strict(),
  my_collection: z
    .object({
      section: z.enum(['shortlist', 'saved_searches', 'visits', 'enquiries']),
    })
    .strict(),
  page_context: z.object({}).strict(),
} as const;
export type ToolName = keyof typeof toolSchemas;
export type ResidenceFact = {
  id: string;
  projectId: string;
  slug: string;
  project: string;
  city: string;
  locality: string;
  type: string;
  unit: string;
  bhk: number;
  area: number;
  price: number;
  availability: string;
  tower: string;
  floor: number;
  amenities: string[];
  possession: string | null;
  image: string | null;
};
export type ToolReference = {
  kind: ToolName;
  facts?: ResidenceFact[];
  details?: Record<string, unknown>;
  filters?: AiFilters;
};
export type ChatMessage = {
  id: string;
  role: string;
  content: string;
  references?: ToolReference[] | null;
  createdAt?: string;
};
export function safeStreamingPrefix(content: string) {
  if (content.length > 2000)
    throw new Error('Response exceeds the safe text limit.');
  if (!content.trim()) return '';
  safeText.parse(content);
  return content.length > 80 ? content.slice(0, -80) : '';
}
export function savedFilters(filters: AiFilters) {
  // The existing saved-search route cannot represent tower/floor/project restrictions.
  // Never silently broaden a saved search.
  if (filters.project || filters.tower || filters.floor !== null) return null;
  return {
    availability: filters.availability || 'AVAILABLE',
    ...Object.fromEntries(
      Object.entries(filters).filter(
        ([key, value]) =>
          key !== 'project' &&
          key !== 'tower' &&
          key !== 'floor' &&
          value !== null,
      ),
    ),
  };
}
