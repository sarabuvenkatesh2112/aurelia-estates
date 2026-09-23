import './database-env.mjs';
import { getDb } from '../lib/db/prisma';
const db = getDb();
async function main() {
  const email = process.env.STAFF_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (!email)
    throw Error(
      'An existing account email must be supplied locally as STAFF_BOOTSTRAP_EMAIL.',
    );
  await db.$transaction(
    async (tx) => {
      // PostgreSQL's void return type is not decoded by Prisma's raw-query API.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(601406)::text`;
      const user = await tx.customer.findFirst({
        where: { email, deletedAt: null },
        select: { id: true, name: true, email: true },
      });
      if (!user?.email) throw Error('The existing account could not be found.');
      const existing = await tx.agent.findUnique({
        where: { customerId: user.id },
      });
      if (existing?.role === 'SUPER_ADMIN' && existing.active) return;
      // This is an explicit local database-owner command, never an HTTP endpoint.
      if (process.env.ALLOW_STAFF_BOOTSTRAP !== 'true')
        throw Error('Explicit ALLOW_STAFF_BOOTSTRAP=true is required.');
      const staff = await tx.agent.upsert({
        where: { customerId: user.id },
        create: {
          customerId: user.id,
          name: user.name,
          email: user.email,
          role: 'SUPER_ADMIN',
        },
        update: {
          role: 'SUPER_ADMIN',
          active: true,
          version: { increment: 1 },
        },
      });
      await tx.auditLogReady.create({
        data: {
          actorReference: 'local-database-owner',
          action: 'Staff bootstrap elevation',
          entityType: 'staff',
          entityId: staff.id,
          metadata: { role: 'SUPER_ADMIN' },
        },
      });
    },
    { isolationLevel: 'Serializable', maxWait: 15000, timeout: 20000 },
  );
  console.log(
    'Local staff bootstrap completed; credentials and account details withheld.',
  );
}
main()
  .catch((error: unknown) => {
    const code =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof error.code === 'string' &&
      /^[A-Z][A-Z0-9_]{1,39}$/.test(error.code)
        ? error.code
        : 'UNCLASSIFIED';
    console.error(
      `Bootstrap did not complete (${code}). Supply an existing account and explicit local opt-in. No credentials were printed.`,
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
