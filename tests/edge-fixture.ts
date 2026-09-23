import '../scripts/database-env.mjs';
import { getDb } from '../lib/db/prisma';
const db = getDb();
const ids = {
  project: 'f4444444-4444-4444-a444-444444444441',
  location: 'f4444444-4444-4444-a444-444444444442',
  tower: 'f4444444-4444-4444-a444-444444444443',
  floor: 'f4444444-4444-4444-a444-444444444444',
  type: 'f4444444-4444-4444-a444-444444444445',
  unit: 'f4444444-4444-4444-a444-444444444446',
};
try {
  if (process.argv[2] === 'remove') {
    const p = await db.project.findUnique({ where: { id: ids.project } });
    if (p && p.slug !== 'phase4-qa-edge-fixture')
      throw new Error('Fixture identity mismatch.');
    if (p)
      await db.$transaction(async (tx) => {
        await tx.propertyView.deleteMany({ where: { projectId: ids.project } });
        await tx.userEvent.deleteMany({ where: { projectId: ids.project } });
        await tx.unit.deleteMany({
          where: { id: ids.unit, projectId: ids.project },
        });
        await tx.unitType.deleteMany({
          where: { id: ids.type, projectId: ids.project },
        });
        await tx.floor.deleteMany({
          where: { id: ids.floor, towerId: ids.tower },
        });
        await tx.tower.deleteMany({
          where: { id: ids.tower, projectId: ids.project },
        });
        await tx.projectAmenity.deleteMany({
          where: { projectId: ids.project },
        });
        await tx.project.delete({ where: { id: ids.project } });
        await tx.location.delete({ where: { id: ids.location } });
      });
    console.log('Temporary QA fixture removed; original projects unchanged.');
  } else {
    const developer = await db.developer.findFirstOrThrow();
    const amenities = await db.amenity.findMany({ select: { id: true } });
    await db.$transaction(
      async (tx) => {
        await tx.location.create({
          data: {
            id: ids.location,
            city: 'QA Test City',
            locality:
              'The exceptionally long landscaped waterfront neighbourhood beside the northern botanical gardens',
            state: 'Fictional Test State',
          },
        });
        await tx.project.create({
          data: {
            id: ids.project,
            slug: 'phase4-qa-edge-fixture',
            name: 'Aurelia The Grand Botanical Waterfront Residences and Private Garden Penthouses Collection',
            shortDescription: 'Temporary fictional layout audit fixture.',
            longDescription:
              'Temporary fictional audit: unusually long names, a large price, many amenities, no gallery, no nearby places and no available units.',
            propertyType: 'PENTHOUSE',
            status: 'SOLD_OUT',
            developerId: developer.id,
            locationId: ids.location,
            amenities: { create: amenities.map((a) => ({ amenityId: a.id })) },
          },
        });
        await tx.tower.create({
          data: {
            id: ids.tower,
            projectId: ids.project,
            name: 'QA Tower',
            code: 'QA',
            totalFloors: 1,
            description: 'Temporary test fixture',
          },
        });
        await tx.floor.create({
          data: {
            id: ids.floor,
            towerId: ids.tower,
            floorNumber: 0,
            label: 'Ground',
          },
        });
        await tx.unitType.create({
          data: {
            id: ids.type,
            projectId: ids.project,
            name: '6 BHK Penthouse',
            bedrooms: 6,
            bathrooms: 6,
            balconies: 4,
            minArea: 20000,
            maxArea: 20000,
            description: 'Temporary test fixture',
          },
        });
        await tx.unit.create({
          data: {
            id: ids.unit,
            projectId: ids.project,
            towerId: ids.tower,
            floorId: ids.floor,
            unitTypeId: ids.type,
            unitNumber: 'QA-1',
            orientation: 'EAST',
            builtUpAreaSqft: 20000,
            carpetAreaSqft: 16000,
            basePrice: 15000000000,
            currentPrice: 15000000000,
            availability: 'SOLD',
          },
        });
      },
      { timeout: 20000 },
    );
    console.log(
      'Temporary database fixture ready at /residences/phase4-qa-edge-fixture/',
    );
  }
} catch {
  console.error('QA fixture operation failed; details withheld.');
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
