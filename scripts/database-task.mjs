import { verifyDatabaseTarget } from './database-env.mjs';
import { spawn } from 'node:child_process';
import pg from 'pg';
const task = process.argv[2] || 'check';
try {
  const target = verifyDatabaseTarget();
  if (task === 'check') {
    for (const [label, url] of [
      ['runtime', process.env.DATABASE_URL],
      ['migration', process.env.DIRECT_URL || process.env.DATABASE_URL],
    ]) {
      const client = new pg.Client({
        connectionString: url,
        connectionTimeoutMillis: 15000,
      });
      try {
        await client.connect();
        const { rows } = await client.query(
          "SELECT current_setting('server_version') AS version",
        );
        console.log(
          `${target} ${label}: connected; PostgreSQL ${rows[0].version}; TLS ${client.connection.stream.encrypted === true}`,
        );
      } finally {
        await client.end();
      }
    }
  } else {
    const args =
      task === 'migrate'
        ? ['node_modules/prisma/build/index.js', 'migrate', 'deploy']
        : task === 'seed'
          ? ['--import', 'tsx', 'prisma/seed.ts']
          : task === 'generate'
            ? ['node_modules/prisma/build/index.js', 'generate']
            : null;
    if (!args) throw new Error('Unsupported database task.');
    const child = spawn(process.execPath, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    const code = await new Promise((resolve) => child.on('close', resolve));
    // Never forward driver/CLI diagnostics that might embed credentials.
    if (code !== 0) {
      console.error(
        `${target} ${task} failed. Diagnostic codes: ${[...new Set(output.match(/\bP\d{4}\b|\b[A-Z0-9]{5}\b/g) || [])].filter((v) => /^P\d{4}$/.test(v)).join(', ') || 'none'}`,
      );
      process.exitCode = 1;
    } else {
      console.log(`${target} ${task}: passed`);
      if (task === 'seed') {
        const counts = output
          .split('\n')
          .find((v) => v.startsWith('{"developers":'));
        if (counts) console.log(counts);
      }
    }
  }
} catch {
  console.error(
    'Database task failed. Check the selected environment file and database availability. Connection details were withheld.',
  );
  process.exitCode = 1;
}
