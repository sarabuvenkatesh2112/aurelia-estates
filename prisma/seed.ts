import '../scripts/database-env.mjs';
import { createHash } from 'node:crypto';
import { getDb } from '../lib/db/prisma';
import { properties } from '../data/properties';
import type {
  PropertyType,
  NearbyCategory,
  UnitAvailability,
} from '../generated/prisma/client';

export const seedId = (key: string) => {
  const h = createHash('sha256').update(`aurelia-demo:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const db = getDb();
async function seed() {
  const dates = [
    '2028-12-01',
    '2026-09-01',
    '2029-06-01',
    '2028-12-01',
    '2029-03-01',
    '2026-09-01',
    '2028-10-01',
    '2029-07-01',
  ];
  const states = [
    'Telangana',
    'Goa',
    'Karnataka',
    'Andhra Pradesh',
    'Andhra Pradesh',
    'Tamil Nadu',
    'Maharashtra',
    'Telangana',
  ];
  const amenities = [
    ...new Set([
      ...properties.flatMap((p) => p.amenities),
      'Infinity Pool',
      'Private Club',
      'Gym',
      'Spa',
      'Sky Lounge',
      'Landscaped Garden',
      "Children's Play Area",
      'Concierge',
      '24/7 Security',
      'EV Charging',
      'Co-working Lounge',
    ]),
  ];
  const amenityIds = new Map<string, string>();
  for (const name of amenities) {
    const saved = await db.amenity.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: {
        id: seedId(`amenity:${name}`),
        name,
        slug: slugify(name),
        category: 'LIFESTYLE',
        icon: 'sparkle',
      },
    });
    amenityIds.set(slugify(name), saved.id);
  }
  for (const code of [
    'WEBSITE',
    'WHATSAPP_READY',
    'AI_ASSISTANT_READY',
    'META_AD_READY',
    'BROCHURE',
    'SITE_VISIT',
    'DIRECT',
  ])
    await db.leadSource.upsert({
      where: { code },
      update: {},
      create: {
        id: seedId(`source:${code}`),
        code,
        label: code.replaceAll('_', ' '),
      },
    });
  for (const code of [
    'DIRECT',
    'GOOGLE',
    'INSTAGRAM',
    'FACEBOOK',
    'META_AD',
    'WHATSAPP',
    'REFERRAL',
  ])
    await db.trafficSource.upsert({
      where: { code },
      update: {},
      create: { id: seedId(`traffic:${code}`), code },
    });
  for (const [i, p] of properties.entries()) {
    const projectId = seedId(p.id);
    await db.$transaction(
      async (tx) => {
        const developer = await tx.developer.upsert({
          where: { slug: slugify(p.developer) },
          update: {},
          create: {
            id: seedId(p.developer),
            name: p.developer,
            slug: slugify(p.developer),
            description:
              'A fictional developer created for the Aurelia portfolio database.',
            establishedYear: 2008 + i,
            city: p.city,
            website: 'https://aurelia.example',
          },
        });
        const location = await tx.location.upsert({
          where: { city_locality: { city: p.city, locality: p.neighbourhood } },
          update: {},
          create: {
            id: seedId(`${p.city}:${p.neighbourhood}`),
            city: p.city,
            locality: p.neighbourhood,
            state: states[i],
            country: 'India',
          },
        });
        const status =
          p.status === 'Ready to move' ? 'READY_TO_MOVE' : 'UNDER_CONSTRUCTION';
        await tx.project.upsert({
          where: { id: projectId },
          update: {},
          create: {
            id: projectId,
            legacyId: p.id,
            name: p.name,
            slug: slugify(p.name),
            shortDescription: p.description,
            longDescription: `${p.description} This fictional collection brings together considered material choices, shared landscaped spaces and individual homes. All inventory, pricing, plans and distances are illustrative.`,
            propertyType: p.type.toUpperCase() as PropertyType,
            status,
            featured: i < 4,
            sortOrder: i,
            launchDate: new Date('2025-01-01'),
            possessionDate: new Date(dates[i]),
            developerId: developer.id,
            locationId: location.id,
          },
        });
        await tx.projectStatusHistory.upsert({
          where: { id: seedId(`project-history:${i}`) },
          update: {},
          create: {
            id: seedId(`project-history:${i}`),
            projectId,
            newStatus: status,
            note: 'Initial fictional seed status',
          },
        });
        const media = [
          {
            url: p.image,
            type: 'HERO' as const,
            alt: `${p.name} architectural mood photography`,
          },
          {
            url: '/images/lounge.webp',
            type: 'INTERIOR' as const,
            alt: 'Illustrative interior mood study',
          },
          {
            url: '/images/garden.webp',
            type: 'AMENITY' as const,
            alt: 'Illustrative landscape mood study',
          },
          {
            url: '/plans/concept-layout.svg',
            type: 'FLOOR_PLAN' as const,
            alt: 'Schematic concept layout; not a measured or construction floor plan',
          },
          {
            url: `/api/projects/${slugify(p.name)}/brochure`,
            type: 'BROCHURE' as const,
            alt: `${p.name} fictional collection brochure`,
          },
        ];
        for (const [m, item] of media.entries())
          await tx.projectMedia.upsert({
            where: { id: seedId(`media:${i}:${m}`) },
            update: {},
            create: {
              id: seedId(`media:${i}:${m}`),
              projectId,
              ...item,
              sortOrder: m,
              metadata: { fictional: true },
            },
          });
        for (const [a, name] of [
          ...p.amenities,
          'Concierge',
          'EV Charging',
        ].entries())
          await tx.projectAmenity.upsert({
            where: {
              projectId_amenityId: {
                projectId,
                amenityId: amenityIds.get(slugify(name))!,
              },
            },
            update: {},
            create: {
              id: seedId(`pa:${i}:${name}`),
              projectId,
              amenityId: amenityIds.get(slugify(name))!,
              description: `${name}, part of this fictional collection.`,
              sortOrder: a,
            },
          });
        const places = [...p.landmarks, 'Neighbourhood hospital · 4 km'];
        for (const [j, landmark] of places.entries()) {
          const [name, distance] = landmark.split(' · ');
          const id = seedId(`nearby:${i}:${j}`);
          const category: NearbyCategory = /Beach/.test(name)
            ? 'BEACH'
            : /metro/.test(name)
              ? 'METRO'
              : /hospital/.test(name)
                ? 'HOSPITAL'
                : /Road/.test(name)
                  ? 'HIGHWAY'
                  : 'BUSINESS_DISTRICT';
          await tx.nearbyPlace.upsert({
            where: { id },
            update: {},
            create: { id, name, category },
          });
          await tx.projectNearbyPlace.upsert({
            where: {
              projectId_nearbyPlaceId: { projectId, nearbyPlaceId: id },
            },
            update: {},
            create: {
              id: seedId(`pn:${i}:${j}`),
              projectId,
              nearbyPlaceId: id,
              distanceKm: parseFloat(distance) || 4,
              estimatedTravelMinutes: (parseInt(distance) || 4) * 3,
            },
          });
        }
        for (let t = 0; t < 2; t++) {
          const typeId = seedId(`type:${i}:${t}`);
          const beds =
            t === 0
              ? p.bedrooms
              : p.bedrooms === 3
                ? i === 4
                  ? 3.5
                  : 2
                : p.bedrooms + 1;
          const area =
            t === 0 ? p.area : Math.round(p.area * (beds / p.bedrooms));
          await tx.unitType.upsert({
            where: { id: typeId },
            update: {},
            create: {
              id: typeId,
              projectId,
              name: `${beds} BHK ${p.type}`,
              bedrooms: beds,
              bathrooms: Math.ceil(beds),
              balconies: 2,
              minArea: area,
              maxArea: area + 100,
              description:
                'Fictional configuration with a schematic illustrative plan.',
              floorPlanMediaId: seedId(`media:${i}:3`),
            },
          });
        }
        for (let t = 0; t < 2; t++) {
          const towerId = seedId(`tower:${i}:${t}`),
            code = t ? 'B' : 'A';
          await tx.tower.upsert({
            where: { id: towerId },
            update: {},
            create: {
              id: towerId,
              projectId,
              name:
                p.type === 'Villa' ? `Garden block ${code}` : `Tower ${code}`,
              code,
              totalFloors: p.type === 'Villa' ? 3 : 26,
              description:
                'Fictional inventory block. Only selected floors are released in this demo.',
              sortOrder: t,
            },
          });
          for (let f = 0; f < 3; f++) {
            const floorId = seedId(`floor:${i}:${t}:${f}`),
              level = p.type === 'Villa' ? f : [0, 18, 22][f];
            await tx.floor.upsert({
              where: { id: floorId },
              update: {},
              create: {
                id: floorId,
                towerId,
                floorNumber: level,
                label:
                  level === 0
                    ? 'Ground'
                    : `Level ${String(level).padStart(2, '0')}`,
              },
            });
            for (let u = 0; u < 2; u++) {
              const unitId = seedId(`unit:${i}:${t}:${f}:${u}`),
                index = t * 6 + f * 2 + u;
              const statuses: UnitAvailability[] = [
                'AVAILABLE',
                'AVAILABLE',
                'AVAILABLE',
                'HOLD',
                'RESERVED',
                'NOT_RELEASED',
                'AVAILABLE',
                'BOOKED',
                'AVAILABLE',
                'SOLD',
                'AVAILABLE',
                'AVAILABLE',
              ];
              const availability = statuses[index];
              const beds =
                u === 0
                  ? p.bedrooms
                  : p.bedrooms === 3
                    ? i === 4
                      ? 3.5
                      : 2
                    : p.bedrooms + 1;
              const area =
                u === 0 ? p.area : Math.round((p.area * beds) / p.bedrooms);
              const price = Math.round(
                p.price * 1e7 * (u === 0 ? 1 : 1.13) + t * 100000 + f * 75000,
              );
              await tx.unit.upsert({
                where: { id: unitId },
                update: {},
                create: {
                  id: unitId,
                  projectId,
                  towerId,
                  floorId,
                  unitTypeId: seedId(`type:${i}:${u}`),
                  unitNumber: `${code}-${level === 0 ? 'G' : level}-${u + 1}`,
                  orientation: u ? 'WEST' : 'EAST',
                  builtUpAreaSqft: area,
                  carpetAreaSqft: Math.round(area * 0.78),
                  basePrice: price - 100000,
                  currentPrice: price,
                  availability,
                  featured: index === 0,
                },
              });
              await tx.unitPriceHistory.upsert({
                where: { id: seedId(`price:${unitId}`) },
                update: {},
                create: {
                  id: seedId(`price:${unitId}`),
                  unitId,
                  oldPrice: price - 100000,
                  newPrice: price,
                  changeReason: 'Fictional launch-to-current price example',
                  effectiveFrom: new Date('2026-09-01'),
                },
              });
              await tx.unitStatusHistory.upsert({
                where: { id: seedId(`status:${unitId}`) },
                update: {},
                create: {
                  id: seedId(`status:${unitId}`),
                  unitId,
                  newStatus: availability,
                  note: 'Initial fictional inventory',
                },
              });
            }
          }
        }
      },
      { timeout: 60000 },
    );
  }
  console.log(
    JSON.stringify({
      developers: await db.developer.count(),
      projects: await db.project.count(),
      towers: await db.tower.count(),
      floors: await db.floor.count(),
      units: await db.unit.count(),
      amenities: await db.amenity.count(),
      nearbyRelationships: await db.projectNearbyPlace.count(),
      priceHistories: await db.unitPriceHistory.count(),
    }),
  );
}
seed()
  .catch(() => {
    console.error('Seed failed; database diagnostics withheld.');
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
