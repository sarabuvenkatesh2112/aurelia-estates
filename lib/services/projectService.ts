import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import {
  getFacets,
  getProjectRecord,
  getInventory,
  searchProjects,
  type ProjectRecord,
  type InventorySummary,
} from '@/lib/repositories/projectRepository';
import { searchSchema, type SearchFilters } from '@/lib/validation/search';
import type { Property } from '@/types/property';
import { projectLocation } from '@/lib/location/repository';

export function toProperty(
  p: ProjectRecord,
  s: Pick<
    InventorySummary,
    | 'minPrice'
    | 'maxPrice'
    | 'minArea'
    | 'maxArea'
    | 'available'
    | 'representativeArea'
    | 'representativeBedrooms'
  >,
): Property {
  const type = {
    APARTMENT: 'Apartment',
    VILLA: 'Villa',
    PENTHOUSE: 'Penthouse',
  } as const;
  return {
    id: p.id,
    slug: p.slug,
    featured: p.featured,
    name: p.name,
    city: p.location.city,
    neighbourhood: p.location.locality,
    type: type[p.propertyType],
    bedrooms: Number(s.representativeBedrooms || p.unitTypes[0]?.bedrooms || 0),
    area: s.representativeArea || s.minArea || 0,
    minArea: s.minArea || 0,
    price: Number(s.minPrice || 0) / 1e7,
    maxPrice: Number(s.maxPrice || 0) / 1e7,
    maxArea: s.maxArea || 0,
    availability:
      Number(s.available) > 3
        ? 'Available'
        : Number(s.available) > 0
          ? 'Limited'
          : 'Sold out',
    status: p.status
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/^./, (v) => v.toUpperCase()),
    possession: p.possessionDate
      ? new Intl.DateTimeFormat('en-IN', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(p.possessionDate)
      : 'To be announced',
    description: p.shortDescription,
    amenities: p.amenities.map((a) => a.amenity.name),
    landmarks: p.nearbyPlaces.map(
      (n) => `${n.nearbyPlace.name} · ${Number(n.distanceKm)} km`,
    ),
    image:
      p.media.find((m) => m.type === 'HERO')?.url || '/images/exterior.webp',
    developer: p.developer.name,
  };
}
export async function searchCollection(filters: SearchFilters) {
  const result = await searchProjects(filters);
  return {
    properties: result.rows.map(({ project, summary }) =>
      toProperty(project, summary),
    ),
    total: result.total,
    page: filters.page,
    pageSize: filters.pageSize,
    pages: Math.ceil(result.total / filters.pageSize),
  };
}
export const collectionFacets = unstable_cache(
  getFacets,
  ['aurelia-facets-v2-public-projects'],
  { revalidate: 300, tags: ['catalog'] },
);
export const homepageCollection = unstable_cache(
  async () => searchCollection(searchSchema.parse({ pageSize: 24 })),
  ['aurelia-home-v2'],
  { revalidate: 60, tags: ['catalog'] },
);
export const projectDetail = cache(async (slug: string, page = 1) => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120)
    return null;
  const project = await getProjectRecord(slug);
  if (!project) return null;
  const [inventory, related, location] = await Promise.all([
    getInventory(project.id, page),
    searchCollection(
      searchSchema.parse({
        city: project.location.city,
        type: project.propertyType,
        pageSize: 6,
      }),
    ),
    projectLocation(slug),
  ]);
  const summary = {
    minPrice: inventory.summary._min.currentPrice!,
    maxPrice: inventory.summary._max.currentPrice!,
    minArea: inventory.summary._min.builtUpAreaSqft || 0,
    maxArea: inventory.summary._max.builtUpAreaSqft || 0,
    available: BigInt(inventory.available),
  };
  const property = toProperty(project, summary);
  return {
    property,
    location,
    description: project.longDescription,
    media: project.media.map((m) => ({
      id: m.id,
      url: m.url,
      type: m.type,
      alt: m.alt,
    })),
    configurations: project.unitTypes.map((t) => ({
      id: t.id,
      name: t.name,
      bedrooms: Number(t.bedrooms),
      area: `${t.minArea.toLocaleString('en-IN')}–${t.maxArea.toLocaleString('en-IN')}`,
      plan: t.floorPlanMedia?.url,
    })),
    towers: project.towers.map((t) => ({
      id: t.id,
      name: t.name,
      totalFloors: t.totalFloors,
      description: t.description,
      floors: t.floors.map((f) => f.label),
    })),
    nearby: project.nearbyPlaces.map((n) => ({
      name: n.nearbyPlace.name,
      category: n.nearbyPlace.category,
      distance: Number(n.distanceKm),
      minutes: n.estimatedTravelMinutes,
    })),
    units: inventory.units.map((u) => ({
      id: u.id,
      number: u.unitNumber,
      tower: u.tower.name,
      floor: u.floor.label,
      configuration: u.unitType.name,
      area: u.builtUpAreaSqft,
      carpetArea: u.carpetAreaSqft,
      price: Number(u.currentPrice),
      availability: u.availability,
      orientation: u.orientation,
    })),
    inventoryTotal: inventory.total,
    inventoryPage: page,
    available: inventory.available,
    related: related.properties.filter((p) => p.id !== project.id).slice(0, 3),
  };
});
export type ProjectDetail = NonNullable<
  Awaited<ReturnType<typeof projectDetail>>
>;
