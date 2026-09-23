import 'server-only';
import { z } from 'zod';
import { intentFilters } from '@/lib/validation/search';
import { collectionFacets, searchCollection } from './projectService';
export async function recommend(input: unknown) {
  const { prompt } = z
    .object({ prompt: z.string().trim().min(2).max(400) })
    .parse(input);
  const facets = await collectionFacets();
  const filters = intentFilters(
    prompt,
    facets.cities.map((c) => c.name),
  );
  const result = await searchCollection(filters);
  return {
    properties: result.properties,
    message: result.total
      ? `Found ${result.total} matching projects with available inventory. Showing up to three considered matches. All project details and prices are fictional.`
      : 'No exact matches. Try a wider budget or another city. This collection guide understands city, BHK, property type and budgets in Cr or Lakhs.',
  };
}
