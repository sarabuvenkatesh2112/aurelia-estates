import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import EmbeddedPostgres from 'embedded-postgres';
import { parse } from 'dotenv';

// An actual disk-backed PostgreSQL server, bound only to this machine.
// Never overwrite an existing Neon/external configuration or delete a cluster.
const env = existsSync('.env') ? parse(readFileSync('.env')) : {};
if (env.DATABASE_URL && !env.DATABASE_URL.includes('@127.0.0.1:55432/aurelia')) {
  throw new Error('An existing DATABASE_URL is configured. Use that database; local setup has not changed it.');
}
const password = env.DATABASE_URL ? decodeURIComponent(new URL(env.DATABASE_URL).password) : randomBytes(24).toString('hex');
const postgres = new EmbeddedPostgres({
  databaseDir: './.local-postgres', user: 'aurelia', password, port: 55432,
  persistent: true, authMethod: 'scram-sha-256',
  postgresFlags: ['-h', '127.0.0.1'], initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: () => {}, onError: () => {},
});
if (!existsSync('.local-postgres/PG_VERSION')) await postgres.initialise();
await postgres.start();
const client = postgres.getPgClient();
await client.connect();
const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'aurelia'");
if (!result.rowCount) await postgres.createDatabase('aurelia');
await client.end();
if (!env.DATABASE_URL) writeFileSync('.env', `DATABASE_URL="postgresql://aurelia:${password}@127.0.0.1:55432/aurelia"\nSITE_URL="http://localhost:3000"\nALLOW_DB_TESTS="true"\n`, {mode:0o600});
console.log('Local PostgreSQL ready at 127.0.0.1:55432. Data persists in .local-postgres. Credentials are in ignored .env.');
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, async () => { await postgres.stop(); process.exit(0); });
setInterval(() => {}, 60000);
