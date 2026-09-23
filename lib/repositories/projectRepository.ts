import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { getDb } from '@/lib/db/prisma';
import type { SearchFilters } from '@/lib/validation/search';

export const projectInclude = {
  developer: true,
  location: true,
  media: { orderBy: { sortOrder: 'asc' as const } },
  amenities: {
    include: { amenity: true },
    orderBy: { sortOrder: 'asc' as const },
  },
  nearbyPlaces: { include: { nearbyPlace: true } },
  unitTypes: { include: { floorPlanMedia: true } },
} satisfies Prisma.ProjectInclude;
export type ProjectRecord = Prisma.ProjectGetPayload<{
  include: typeof projectInclude;
}>;
export type InventorySummary = {
  id: string;
  minPrice: Prisma.Decimal;
  maxPrice: Prisma.Decimal;
  minArea: number;
  maxArea: number;
  available: bigint;
  representativeArea?: number;
  representativeBedrooms?: Prisma.Decimal;
  total: bigint;
};

// All values are bound parameters. Only whitelisted SQL fragments select sorting.
export async function searchProjects(filters: SearchFilters) {
  const f = filters,
    conditions: Prisma.Sql[] = [
      Prisma.sql`p."deletedAt" IS NULL`,
      Prisma.sql`p.status <> 'ARCHIVED'`,
    ];
  if (f.keyword)
    conditions.push(
      Prisma.sql`(p.name ILIKE ${`%${f.keyword}%`} OR p."shortDescription" ILIKE ${`%${f.keyword}%`} OR l.locality ILIKE ${`%${f.keyword}%`})`,
    );
  if (f.city)
    conditions.push(
      Prisma.sql`(lower(l.city) = lower(${f.city}) OR replace(lower(l.city),' ','-') = lower(${f.city}))`,
    );
  if (f.locality)
    conditions.push(Prisma.sql`l.locality ILIKE ${`%${f.locality}%`}`);
  if (f.type) conditions.push(Prisma.sql`p."propertyType"::text = ${f.type}`);
  if (f.status) conditions.push(Prisma.sql`p.status::text = ${f.status}`);
  if (f.developer)
    conditions.push(Prisma.sql`p."developerId" = ${f.developer}::uuid`);
  if (f.possessionBefore)
    conditions.push(
      Prisma.sql`p."possessionDate" <= ${new Date(f.possessionBefore)}`,
    );
  if (f.bhk !== undefined) conditions.push(Prisma.sql`ut.bedrooms = ${f.bhk}`);
  if (f.minPrice !== undefined)
    conditions.push(Prisma.sql`u."currentPrice" >= ${f.minPrice}`);
  if (f.maxPrice !== undefined)
    conditions.push(Prisma.sql`u."currentPrice" <= ${f.maxPrice}`);
  if (f.minArea !== undefined)
    conditions.push(Prisma.sql`u."builtUpAreaSqft" >= ${f.minArea}`);
  if (f.maxArea !== undefined)
    conditions.push(Prisma.sql`u."builtUpAreaSqft" <= ${f.maxArea}`);
  if (f.availability)
    conditions.push(Prisma.sql`u.availability::text = ${f.availability}`);
  else conditions.push(Prisma.sql`u.availability <> 'NOT_RELEASED'`);
  for (const amenity of f.amenities)
    conditions.push(
      Prisma.sql`EXISTS(SELECT 1 FROM "ProjectAmenity" pa JOIN "Amenity" a ON a.id=pa."amenityId" WHERE pa."projectId"=p.id AND a.slug=${amenity})`,
    );
  const cte = Prisma.sql`WITH matches AS (
    SELECT p.id, MIN(u."currentPrice") AS "minPrice",MAX(u."currentPrice") AS "maxPrice",MIN(u."builtUpAreaSqft")::int AS "minArea",MAX(u."builtUpAreaSqft")::int AS "maxArea",
    (array_agg(u."builtUpAreaSqft" ORDER BY u."currentPrice",u.id))[1] AS "representativeArea",
    (array_agg(ut.bedrooms ORDER BY u."currentPrice",u.id))[1] AS "representativeBedrooms",
    (SELECT COUNT(*) FROM "Unit" stock WHERE stock."projectId"=p.id AND stock.availability='AVAILABLE') AS available
    FROM "Project" p JOIN "Location" l ON l.id=p."locationId" JOIN "Unit" u ON u."projectId"=p.id JOIN "UnitType" ut ON ut.id=u."unitTypeId"
    WHERE ${Prisma.join(conditions, ' AND ')} GROUP BY p.id)`;
  const sorts = {
    featured: Prisma.sql`p.featured DESC,p."sortOrder" ASC`,
    newest: Prisma.sql`p.created_at DESC`,
    'price-asc': Prisma.sql`m."minPrice" ASC`,
    'price-desc': Prisma.sql`m."minPrice" DESC`,
    area: Prisma.sql`m."minArea" DESC`,
    possession: Prisma.sql`p."possessionDate" ASC NULLS LAST`,
  };
  return getDb().$transaction(
    async (tx) => {
      const [count] = await tx.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`${cte} SELECT COUNT(*) AS total FROM matches`,
      );
      const rows = await tx.$queryRaw<InventorySummary[]>(
        Prisma.sql`${cte} SELECT m.* FROM matches m JOIN "Project" p ON p.id=m.id ORDER BY ${sorts[f.sort]},p.id LIMIT ${f.pageSize} OFFSET ${(f.page - 1) * f.pageSize}`,
      );
      const projects = await tx.project.findMany({
        where: { id: { in: rows.map((r) => r.id) } },
        include: projectInclude,
      });
      return {
        total: Number(count.total),
        rows: rows.map((summary) => ({
          summary,
          project: projects.find((p) => p.id === summary.id)!,
        })),
      };
    },
    { isolationLevel: 'RepeatableRead', maxWait: 15000, timeout: 20000 },
  );
}
export const getProjectRecord = (slug: string) =>
  getDb().project.findFirst({
    where: { slug, deletedAt: null, status: { not: 'ARCHIVED' } },
    include: {
      ...projectInclude,
      towers: {
        include: { floors: { orderBy: { floorNumber: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
export async function getInventory(
  projectId: string,
  page = 1,
  availability?: 'AVAILABLE',
) {
  const where = { projectId, ...(availability ? { availability } : {}) };
  const [units, total, summary] = await Promise.all([
    getDb().unit.findMany({
      where,
      include: { tower: true, floor: true, unitType: true },
      orderBy: [
        { tower: { sortOrder: 'asc' } },
        { floor: { floorNumber: 'asc' } },
        { unitNumber: 'asc' },
      ],
      skip: (page - 1) * 12,
      take: 12,
    }),
    getDb().unit.count({ where }),
    getDb().unit.aggregate({
      where: { projectId, availability: { not: 'NOT_RELEASED' } },
      _min: { currentPrice: true, builtUpAreaSqft: true },
      _max: { currentPrice: true, builtUpAreaSqft: true },
    }),
  ]);
  return {
    units,
    total,
    summary,
    available: await getDb().unit.count({
      where: { projectId, availability: 'AVAILABLE' },
    }),
  };
}
export async function getFacets() {
  const [locations, developers, amenities, types] = await Promise.all([
    getDb().location.findMany({
      where: {
        projects: { some: { deletedAt: null, status: { not: 'ARCHIVED' } } },
      },
      include: {
        _count: {
          select: {
            projects: {
              where: { deletedAt: null, status: { not: 'ARCHIVED' } },
            },
          },
        },
      },
      orderBy: { city: 'asc' },
    }),
    getDb().developer.findMany({
      where: {
        active: true,
        projects: { some: { deletedAt: null, status: { not: 'ARCHIVED' } } },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    getDb().amenity.findMany({
      where: {
        projects: {
          some: { project: { deletedAt: null, status: { not: 'ARCHIVED' } } },
        },
      },
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
    }),
    getDb().unitType.findMany({
      where: { project: { deletedAt: null, status: { not: 'ARCHIVED' } } },
      select: { bedrooms: true, projectId: true },
      distinct: ['bedrooms', 'projectId'],
    }),
  ]);
  const counts = new Map<string, number>();
  for (const l of locations)
    counts.set(l.city, (counts.get(l.city) || 0) + l._count.projects);
  const bedrooms = new Map<number, number>();
  for (const t of types)
    bedrooms.set(
      Number(t.bedrooms),
      (bedrooms.get(Number(t.bedrooms)) || 0) + 1,
    );
  return {
    cities: [...counts].map(([name, count]) => ({ name, count })),
    localities: locations.map((l) => l.locality),
    developers,
    amenities,
    bedrooms: [...bedrooms]
      .sort((a, b) => a[0] - b[0])
      .map(([value, count]) => ({ value, count })),
  };
}
