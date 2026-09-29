import 'server-only';
import { getDb } from '@/lib/db/prisma';
import {
  coordinatesSchema,
  mapsLinks,
  slugSchema,
  verifiedContext,
  type PublicLocation,
} from './contracts';

export const locationSelect = {
  slug: true,
  name: true,
  publicAddress: true,
  mapLabel: true,
  latitude: true,
  longitude: true,
  locationNarrative: true,
  locationSource: true,
  locationVerifiedAt: true,
  location: {
    select: { city: true, locality: true, state: true, postalCode: true },
  },
  nearbyPlaces: {
    take: 30,
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      distanceKm: true,
      estimatedTravelMinutes: true,
      isIllustrative: true,
      sourceNote: true,
      contextNote: true,
      verifiedAt: true,
      nearbyPlace: {
        select: { name: true, category: true, latitude: true, longitude: true },
      },
    },
  },
} as const;
function coords(lat: unknown, lng: unknown) {
  if (lat === null || lng === null) return null;
  const parsed = coordinatesSchema.safeParse({
    lat: Number(lat),
    lng: Number(lng),
  });
  return parsed.success ? parsed.data : null;
}
export async function projectLocation(
  slug: string,
): Promise<PublicLocation | null> {
  slugSchema.parse(slug);
  const p = await getDb().project.findFirst({
    where: { slug, deletedAt: null, status: { not: 'ARCHIVED' } },
    select: locationSelect,
  });
  if (!p) return null;
  const coordinates = coords(p.latitude, p.longitude);
  const verified =
    !!coordinates &&
    verifiedContext(false, p.locationSource, p.locationVerifiedAt);
  return {
    slug: p.slug,
    name: p.name,
    ...p.location,
    address: p.publicAddress,
    label: p.mapLabel || p.name,
    coordinates,
    verified,
    source: p.locationSource,
    verifiedAt: p.locationVerifiedAt?.toISOString() || null,
    narrative: p.locationNarrative,
    ...mapsLinks({ ...p.location, coordinates, verified }),
    nearby: p.nearbyPlaces.map((n) => {
      const checked = verifiedContext(
        n.isIllustrative,
        n.sourceNote,
        n.verifiedAt,
      );
      const point = coords(n.nearbyPlace.latitude, n.nearbyPlace.longitude);
      return {
        id: n.id,
        name: n.nearbyPlace.name,
        category: n.nearbyPlace.category,
        coordinates: point,
        distanceKm: checked ? Number(n.distanceKm) : null,
        minutes: checked ? n.estimatedTravelMinutes : null,
        illustrative: !checked,
        source: n.sourceNote,
        note: n.contextNote,
        verifiedAt: n.verifiedAt?.toISOString() || null,
        routeEligible: verified && checked && !!point,
      };
    }),
  };
}
