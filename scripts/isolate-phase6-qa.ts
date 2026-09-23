import './database-env.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { getDb } from '../lib/db/prisma';
const db = getDb();
async function main() {
  const records = JSON.parse(
    readFileSync('.cache/phase6-test-records.json', 'utf8'),
  ) as { unitId: string };
  await db.$transaction(
    async (tx) => {
      const unit = await tx.unit.findUniqueOrThrow({
        where: { id: records.unitId },
        include: { project: true, tower: true, floor: true, unitType: true },
      });
      if (!unit.unitNumber.startsWith('QA-'))
        throw Error('Refusing to move a non-QA unit.');
      if (unit.project.slug === 'phase6-isolated-qa-inventory') return;
      if (
        (await tx.siteVisit.count({ where: { unitId: unit.id } })) ||
        (await tx.lead.count({ where: { unitId: unit.id } }))
      )
        throw Error('Refusing to move a referenced unit.');
      const project = await tx.project.upsert({
        where: { slug: 'phase6-isolated-qa-inventory' },
        update: {},
        create: {
          name: 'Phase Six QA Inventory — Archived',
          slug: 'phase6-isolated-qa-inventory',
          shortDescription:
            'Isolated test records, excluded from public discovery.',
          longDescription:
            'Fictional operational test fixtures. Never a marketed project.',
          propertyType: unit.project.propertyType,
          status: 'ARCHIVED',
          developerId: unit.project.developerId,
          locationId: unit.project.locationId,
        },
      });
      const tower = await tx.tower.upsert({
        where: { projectId_code: { projectId: project.id, code: 'QA' } },
        update: {},
        create: {
          projectId: project.id,
          name: 'QA Tower',
          code: 'QA',
          totalFloors: 1,
          description: 'Isolated verification fixture',
        },
      });
      const floor = await tx.floor.upsert({
        where: { towerId_floorNumber: { towerId: tower.id, floorNumber: 0 } },
        update: {},
        create: { towerId: tower.id, floorNumber: 0, label: 'QA Ground' },
      });
      const type = await tx.unitType.upsert({
        where: {
          projectId_name: { projectId: project.id, name: 'QA Configuration' },
        },
        update: {},
        create: {
          projectId: project.id,
          name: 'QA Configuration',
          bedrooms: unit.unitType.bedrooms,
          bathrooms: unit.unitType.bathrooms,
          balconies: unit.unitType.balconies,
          minArea: unit.unitType.minArea,
          maxArea: unit.unitType.maxArea,
          description: 'Isolated verification fixture',
        },
      });
      await tx.unit.update({
        where: { id: unit.id },
        data: {
          projectId: project.id,
          towerId: tower.id,
          floorId: floor.id,
          unitTypeId: type.id,
        },
      });
      await tx.auditLogReady.create({
        data: {
          actorReference: 'local-qa-isolation',
          action: 'QA-only inventory isolated from public collection',
          entityType: 'unit',
          entityId: unit.id,
          metadata: {
            previousProject: unit.projectId,
            archivedProject: project.id,
          },
        },
      });
    },
    { isolationLevel: 'Serializable', maxWait: 15000, timeout: 20000 },
  );
  const counts = {
    publicProjects: await db.project.count({
      where: { deletedAt: null, status: { not: 'ARCHIVED' } },
    }),
    publicUnits: await db.unit.count({
      where: { project: { deletedAt: null, status: { not: 'ARCHIVED' } } },
    }),
    totalUnits: await db.unit.count(),
  };
  writeFileSync('.cache/phase6-isolation-result.json', JSON.stringify(counts));
  console.log(JSON.stringify(counts));
}
main()
  .catch(() => {
    console.error('QA isolation failed safely; diagnostics withheld.');
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
