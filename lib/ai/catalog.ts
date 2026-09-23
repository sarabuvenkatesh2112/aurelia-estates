import 'server-only';
import { getDb } from '@/lib/db/prisma';
import type { Prisma } from '@/generated/prisma/client';
import {
  filtersSchema,
  toolSchemas,
  type AiFilters,
  type ResidenceFact,
  type ToolName,
  type ToolReference,
} from './contracts';
import { PublicError } from '@/lib/http';
import { requireCustomer } from '@/lib/auth/server';

export const publicProject = {
  deletedAt: null,
  status: { not: 'ARCHIVED' as const },
};
const selection = {
  id: true,
  unitNumber: true,
  builtUpAreaSqft: true,
  currentPrice: true,
  availability: true,
  tower: { select: { name: true } },
  floor: { select: { floorNumber: true } },
  unitType: { select: { bedrooms: true } },
  project: {
    select: {
      id: true,
      name: true,
      slug: true,
      propertyType: true,
      possessionDate: true,
      location: { select: { city: true, locality: true } },
      amenities: { take: 30, select: { amenity: { select: { name: true } } } },
      media: {
        where: { type: 'HERO' as const },
        take: 1,
        orderBy: { sortOrder: 'asc' as const },
        select: { url: true },
      },
    },
  },
} satisfies Prisma.UnitSelect;
type UnitRow = Prisma.UnitGetPayload<{ select: typeof selection }>;
function fact(row: UnitRow): ResidenceFact {
  return {
    id: row.id,
    unit: row.unitNumber,
    projectId: row.project.id,
    project: row.project.name,
    slug: row.project.slug,
    type: row.project.propertyType,
    city: row.project.location.city,
    locality: row.project.location.locality,
    bhk: Number(row.unitType.bedrooms),
    area: row.builtUpAreaSqft,
    price: Number(row.currentPrice),
    availability: row.availability,
    tower: row.tower.name,
    floor: row.floor.floorNumber,
    amenities: row.project.amenities.map((a) => a.amenity.name),
    possession: row.project.possessionDate?.toISOString().slice(0, 10) || null,
    image: row.project.media[0]?.url || null,
  };
}
export function unitWhere(raw: AiFilters): Prisma.UnitWhereInput {
  const f = filtersSchema.parse(raw);
  return {
    availability: f.availability || 'AVAILABLE',
    currentPrice: {
      ...(f.minPrice !== null ? { gte: f.minPrice } : {}),
      ...(f.maxPrice !== null ? { lte: f.maxPrice } : {}),
    },
    builtUpAreaSqft: {
      ...(f.minArea !== null ? { gte: f.minArea } : {}),
      ...(f.maxArea !== null ? { lte: f.maxArea } : {}),
    },
    ...(f.bhk !== null ? { unitType: { bedrooms: f.bhk } } : {}),
    ...(f.floor !== null ? { floor: { floorNumber: f.floor } } : {}),
    ...(f.tower
      ? { tower: { name: { equals: f.tower, mode: 'insensitive' } } }
      : {}),
    project: {
      ...publicProject,
      ...(f.project
        ? {
            OR: [
              { slug: f.project },
              { name: { equals: f.project, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(f.type ? { propertyType: f.type } : {}),
      ...(f.possessionBefore
        ? { possessionDate: { lte: new Date(f.possessionBefore) } }
        : {}),
      location: {
        ...(f.city ? { city: { equals: f.city, mode: 'insensitive' } } : {}),
        ...(f.locality
          ? { locality: { contains: f.locality, mode: 'insensitive' } }
          : {}),
      },
      AND: f.amenities.map((slug) => ({
        amenities: { some: { amenity: { slug } } },
      })),
    },
  };
}
export async function publicFacts(ids: string[]) {
  return (
    await getDb().unit.findMany({
      where: {
        id: { in: ids },
        project: publicProject,
        availability: { not: 'NOT_RELEASED' },
      },
      select: selection,
      take: 4,
    })
  ).map(fact);
}
export async function executeTool(
  name: string,
  raw: unknown,
  headers: Headers,
  context: string | null,
): Promise<ToolReference> {
  if (!Object.hasOwn(toolSchemas, name))
    throw new PublicError('That capability is unavailable.');
  const kind = name as ToolName;
  if (kind === 'search_residences') {
    const { filters } = toolSchemas.search_residences.parse(raw);
    const rows = await getDb().unit.findMany({
      where: unitWhere(filters),
      select: selection,
      take: 6,
      orderBy: [{ currentPrice: 'asc' }, { id: 'asc' }],
    });
    return { kind, facts: rows.map(fact), filters };
  }
  if (kind === 'compare_units') {
    const { ids } = toolSchemas.compare_units.parse(raw);
    const facts = await publicFacts([...new Set(ids)]);
    if (facts.length !== new Set(ids).size || facts.length < 2)
      throw new PublicError('One or more residences are unavailable.');
    return { kind, facts };
  }
  if (kind === 'page_context' || kind === 'project_details') {
    const slug =
      kind === 'page_context'
        ? (toolSchemas.page_context.parse(raw), context)
        : toolSchemas.project_details.parse(raw).slug;
    if (!slug)
      return {
        kind,
        details: { message: 'No project is currently selected.' },
      };
    const p = await getDb().project.findFirst({
      where: { slug, ...publicProject },
      select: {
        name: true,
        slug: true,
        status: true,
        propertyType: true,
        possessionDate: true,
        location: { select: { city: true, locality: true } },
        amenities: {
          take: 30,
          select: { amenity: { select: { name: true, slug: true } } },
        },
        unitTypes: {
          take: 20,
          select: { name: true, bedrooms: true, minArea: true, maxArea: true },
        },
        nearbyPlaces: {
          take: 15,
          select: {
            distanceKm: true,
            isIllustrative: true,
            nearbyPlace: { select: { name: true, category: true } },
          },
        },
      },
    });
    return {
      kind,
      details: p
        ? JSON.parse(JSON.stringify(p))
        : {
            message:
              'This project is not in the public catalogue. Its features cannot be verified.',
          },
    };
  }
  const { section } = toolSchemas.my_collection.parse(raw);
  const user = await requireCustomer(headers);
  if (section === 'shortlist')
    return {
      kind,
      details: {
        section,
        records: await getDb().favoriteReady.findMany({
          where: { customerId: user.id, project: publicProject },
          take: 20,
          select: {
            id: true,
            project: { select: { id: true, name: true, slug: true } },
          },
        }),
      },
    };
  if (section === 'saved_searches')
    return {
      kind,
      details: {
        section,
        records: await getDb().savedSearchReady.findMany({
          where: { customerId: user.id },
          take: 20,
          select: { id: true, name: true, filters: true },
        }),
      },
    };
  if (section === 'visits')
    return {
      kind,
      details: {
        section,
        records: JSON.parse(
          JSON.stringify(
            await getDb().siteVisit.findMany({
              where: { customerId: user.id },
              take: 20,
              orderBy: { createdAt: 'desc' },
              select: {
                reference: true,
                status: true,
                preferredDate: true,
                preferredTime: true,
                scheduledDate: true,
                scheduledTime: true,
                project: { select: { name: true } },
              },
            }),
          ),
        ),
      },
    };
  return {
    kind,
    details: {
      section,
      records: JSON.parse(
        JSON.stringify(
          await getDb().enquiry.findMany({
            where: { customerId: user.id },
            take: 20,
            orderBy: { createdAt: 'desc' },
            select: {
              reference: true,
              createdAt: true,
              project: { select: { name: true } },
            },
          }),
        ),
      ),
    },
  };
}
