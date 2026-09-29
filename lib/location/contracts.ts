import { z } from 'zod';

export const categories = [
  'AIRPORT',
  'METRO',
  'RAILWAY_STATION',
  'HIGHWAY',
  'IT_HUB',
  'BUSINESS_DISTRICT',
  'SCHOOL',
  'HOSPITAL',
  'MALL',
  'RESTAURANT',
  'PARK',
  'BEACH',
] as const;
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(120);
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => !/[<>\p{Cc}]/u.test(v), 'Use plain text.');
export const coordinatesSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .strict();
export type Coordinates = z.infer<typeof coordinatesSchema>;
export const nearbyEditSchema = z
  .object({
    id: z.uuid().optional(),
    name: text(160).min(1),
    category: z.enum(categories),
    coordinates: coordinatesSchema.nullable(),
    distanceKm: z.number().min(0).max(9999),
    minutes: z.number().int().min(1).max(10080).nullable(),
    illustrative: z.boolean(),
    source: text(500).nullable(),
    note: text(800).nullable(),
  })
  .strict()
  .refine(
    (v) => v.illustrative || !!v.source,
    'Verified context requires a source.',
  );
export const locationEditSchema = z
  .object({
    version: z.number().int().min(0),
    address: text(400).nullable(),
    label: text(160).nullable(),
    coordinates: coordinatesSchema.nullable(),
    narrative: text(1600).nullable(),
    source: text(500).nullable(),
    verified: z.boolean(),
    nearby: z.array(nearbyEditSchema).max(30),
  })
  .strict()
  .refine(
    (v) => !v.verified || (!!v.coordinates && !!v.source && !!v.address),
    'A verified location requires coordinates, address and source.',
  );
export type LocationEdit = z.infer<typeof locationEditSchema>;
export type PublicLocation = {
  slug: string;
  name: string;
  city: string;
  locality: string;
  state: string;
  postalCode: string | null;
  address: string | null;
  label: string;
  coordinates: Coordinates | null;
  verified: boolean;
  source: string | null;
  verifiedAt: string | null;
  narrative: string | null;
  mapsUrl: string;
  directionsUrl: string | null;
  nearby: {
    id: string;
    name: string;
    category: string;
    coordinates: Coordinates | null;
    distanceKm: number | null;
    minutes: number | null;
    illustrative: boolean;
    source: string | null;
    note: string | null;
    verifiedAt: string | null;
    routeEligible: boolean;
  }[];
};
// Only trusted database fields reach this builder; callers never supply a redirect URL.
export function mapsLinks(place: {
  locality: string;
  city: string;
  coordinates: Coordinates | null;
  verified: boolean;
}) {
  const coords = coordinatesSchema.safeParse(place.coordinates);
  const precise = place.verified && coords.success;
  const destination = precise
    ? `${coords.data.lat},${coords.data.lng}`
    : `${place.locality}, ${place.city}, India`;
  const query = new URLSearchParams({ api: '1', query: destination });
  return {
    mapsUrl: `https://www.google.com/maps/search/?${query}`,
    directionsUrl: precise
      ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', destination, travelmode: 'driving' })}`
      : null,
  };
}
export function verifiedContext(
  illustrative: boolean,
  source: string | null,
  date: Date | null,
) {
  return (
    !illustrative &&
    !!source?.trim() &&
    !!date &&
    date.getTime() <= Date.now() &&
    Date.now() - date.getTime() < 180 * 86400000
  );
}
