import { verifyDatabaseTarget } from '../../scripts/database-env.mjs';
import { PrismaClient } from '@/generated/prisma/client';
import { SequencedPrismaPg } from './sequenced-pg';

const state = globalThis as unknown as { aureliaDb?: PrismaClient };
export function getDb() {
  verifyDatabaseTarget();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!state.aureliaDb) {
    state.aureliaDb = new PrismaClient({
      adapter: new SequencedPrismaPg({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 30000,
      }),
      log: [],
    });
  }
  return state.aureliaDb;
}
