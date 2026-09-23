import './database-env.mjs';
import { getDb } from '../lib/db/prisma';
const db = getDb();
try {
  const enquiry = await db.enquiry.findUniqueOrThrow({
    where: { reference: 'AE-46768D9D37D9' },
    select: {
      customerId: true,
      project: { select: { slug: true } },
      lead: { select: { email: true } },
    },
  });
  const visit = await db.siteVisit.findUniqueOrThrow({
    where: { reference: 'AV-C43A25C2F03E' },
    select: {
      customerId: true,
      status: true,
      preferredDate: true,
      preferredTime: true,
      unit: { select: { unitNumber: true } },
      project: { select: { slug: true } },
      lead: { select: { email: true } },
    },
  });
  const browserHandoffs =
    enquiry.lead.email === 'phase7-browser@example.test' &&
    visit.lead.email === enquiry.lead.email &&
    enquiry.customerId === null &&
    visit.customerId === null &&
    visit.project.slug === 'the-eastern-grove' &&
    visit.unit?.unitNumber === 'A-G-1' &&
    visit.status === 'REQUESTED' &&
    visit.preferredTime === '11:00' &&
    visit.preferredDate.toISOString().startsWith('2026-09-22');
  const publicWhere = { deletedAt: null, status: { not: 'ARCHIVED' as const } };
  const result = {
    browserHandoffs,
    publicProjects: await db.project.count({ where: publicWhere }),
    publicUnits: await db.unit.count({ where: { project: publicWhere } }),
    activeTemporaryQaStaff: await db.agent.count({
      where: {
        email: 'phase5-browser-1789283702224@example.test',
        active: true,
      },
    }),
    migrationApplied:
      (
        await db.$queryRaw<
          { count: bigint }[]
        >`SELECT COUNT(*) AS count FROM "_prisma_migrations" WHERE migration_name='20260919090000_phase7_concierge' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`
      )[0].count === BigInt(1),
  };
  console.log(JSON.stringify(result));
  if (
    !browserHandoffs ||
    result.publicProjects !== 8 ||
    result.publicUnits !== 96 ||
    result.activeTemporaryQaStaff !== 0 ||
    !result.migrationApplied
  )
    process.exitCode = 1;
} catch {
  console.error(
    'Final data verification failed; private diagnostics withheld.',
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
