import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'dotenv';

// Neon is primary. The existing local credentials and cluster are never rewritten.
const target = process.env.DB_TARGET || 'neon';
const file =
  process.env.AURELIA_ENV_FILE || (target === 'local' ? '.env' : '.env.neon');
if (existsSync(file)) {
  const values = parse(readFileSync(file));
  for (const key of [
    'DATABASE_URL',
    'DIRECT_URL',
    'SITE_URL',
    'ALLOW_DB_TESTS',
  ]) {
    if (values[key]) process.env[key] = values[key];
  }
  if (target === 'local') delete process.env.DIRECT_URL;
}
export function verifyDatabaseTarget() {
  const pooled = new URL(process.env.DATABASE_URL || '');
  if (target === 'neon') {
    const direct = new URL(process.env.DIRECT_URL || '');
    if (
      !pooled.hostname.endsWith('.neon.tech') ||
      !direct.hostname.endsWith('.neon.tech')
    )
      throw new Error('Neon connection configuration is required.');
    if (
      pooled.pathname !== direct.pathname ||
      pooled.hostname.replace('-pooler', '') !== direct.hostname
    )
      throw new Error(
        'Pooled and direct connections must target the same Neon database.',
      );
    for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
      const url = new URL(process.env[key]);
      url.searchParams.set('sslmode', 'verify-full');
      process.env[key] = url.toString();
    }
  } else if (!['localhost', '127.0.0.1'].includes(pooled.hostname))
    throw new Error('Local mode requires a loopback PostgreSQL connection.');
  return target;
}
if (process.env.DATABASE_URL && (target === 'local' || process.env.DIRECT_URL))
  verifyDatabaseTarget();
