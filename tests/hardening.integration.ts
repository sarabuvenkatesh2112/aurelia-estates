import '../scripts/database-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { getDb } from '../lib/db/prisma';
import { POST } from '../app/api/auth/[...all]/route';

if (process.env.ALLOW_DB_TESTS !== 'true')
  throw Error('Explicit QA opt-in required.');
const db = getDb(),
  base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const qa = JSON.parse(readFileSync('.cache/phase6-qa.json', 'utf8'));
const cookies: string[] = [];
const priorHeader = process.env.AUTH_TRUSTED_IP_HEADER;
process.env.AUTH_TRUSTED_IP_HEADER = 'x-aurelia-proxy-ip';
const suffix = randomUUID(),
  ip = '2001:db8:' + suffix.slice(0, 4) + ':' + suffix.slice(9, 13) + '::1';
const separateSubnet = (index: number) =>
  ip.replace('2001:db8:', `2001:${(0xdb9 + index).toString(16)}:`);
async function authPost(
  body: unknown,
  address = ip,
  spoof = '198.51.100.8',
  path = 'sign-in/email',
) {
  return POST(
    new Request(base + '/api/auth/' + path + '/', {
      method: 'POST',
      headers: {
        Origin: base,
        Host: new URL(base).host,
        'Content-Type': 'application/json',
        'x-aurelia-proxy-ip': address,
        'x-aurelia-client': spoof,
      },
      body: JSON.stringify(body),
    }),
  );
}
try {
  await test('auth failure limits are persisted, cannot be bypassed with internal-header spoofing, and isolate trusted IPs', async () => {
    const body = {
      email: 'phase10-missing-' + suffix + '@example.test',
      password: 'WrongPassword!123',
    };
    for (let i = 0; i < 10; i++)
      assert.equal(
        (await authPost(body, ip, '198.51.100.' + (i + 1))).status,
        401,
      );
    assert.equal((await authPost(body)).status, 429);
    assert.equal((await authPost(body, ip.replace('::1', '::2'))).status, 429);
    assert.equal((await authPost(body, separateSubnet(0))).status, 401);
    assert.equal((await authPost(body, 'invalid')).status, 403);
    assert.ok(
      await db.authRateLimit.count({
        where: { key: { contains: suffix.slice(0, 4) } },
      }),
    );
  });
  await test('direct API role matrix covers CRM, inventory, visits, communications, analytics, locations and audit', async () => {
    const routes = [
      'leads',
      'inventory',
      'visits',
      'follow-ups',
      'communications',
      'analytics',
      'audit',
      'locations/the-eastern-grove',
    ];
    for (const [index, role] of [
      'SUPER_ADMIN',
      'ADMIN',
      'SALES_MANAGER',
      'SALES_AGENT',
      'VIEWER',
      'CUSTOMER',
      'GUEST',
    ].entries()) {
      let cookie = '';
      if (role !== 'GUEST') {
        const response = await authPost(
          { email: qa.identities[role].email, password: qa.password },
          separateSubnet(index + 1),
        );
        assert.equal(response.status, 200, role + ' sign-in');
        cookie = response.headers
          .getSetCookie()
          .map((v) => v.split(';')[0])
          .join('; ');
        cookies.push(cookie);
      }
      for (const route of routes) {
        let expected = 200;
        if (role === 'GUEST') expected = 401;
        else if (role === 'CUSTOMER') expected = 403;
        else if (
          route === 'analytics' &&
          !['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'].includes(role)
        )
          expected = 403;
        else if (
          (route === 'audit' || route.startsWith('locations/')) &&
          !['SUPER_ADMIN', 'ADMIN'].includes(role)
        )
          expected = 403;
        const response = await fetch(base + '/api/admin/' + route + '/', {
          headers: { Cookie: cookie },
          signal: AbortSignal.timeout(60000),
        });
        await response.arrayBuffer();
        assert.equal(response.status, expected, role + ' ' + route);
      }
      if (role === 'ADMIN') {
        const r = await fetch(base + '/api/admin/leads/', {
          method: 'POST',
          headers: {
            Cookie: cookie,
            Origin: 'https://untrusted.example',
            'Content-Type': 'application/json',
          },
          body: '{}',
        });
        assert.equal(r.status, 403);
      }
    }
  });
  await test('applied migration checksums, public inventory and revoked browser elevation remain intact', async () => {
    const migrations = await db.$queryRawUnsafe<
      {
        migration_name: string;
        checksum: string;
        finished_at: Date | null;
        rolled_back_at: Date | null;
      }[]
    >(
      'SELECT migration_name,checksum,finished_at,rolled_back_at FROM "_prisma_migrations"',
    );
    const names = readdirSync('prisma/migrations', { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    for (const name of names) {
      const row = migrations.find(
        (m) => m.migration_name === name && m.finished_at && !m.rolled_back_at,
      );
      assert.ok(row, 'Applied migration ' + name);
      const content = readFileSync(
        'prisma/migrations/' + name + '/migration.sql',
        'utf8',
      );
      assert.ok(
        [
          content,
          content.replace(/\r\n/g, '\n'),
          content.replace(/\r?\n/g, '\r\n'),
        ].some(
          (v) => createHash('sha256').update(v).digest('hex') === row.checksum,
        ),
        'Unmodified migration ' + name,
      );
    }
    assert.equal(
      await db.project.count({
        where: { deletedAt: null, status: { not: 'ARCHIVED' } },
      }),
      8,
    );
    assert.equal(
      await db.unit.count({
        where: { project: { deletedAt: null, status: { not: 'ARCHIVED' } } },
      }),
      96,
    );
    assert.equal(
      await db.agent.count({
        where: {
          email: 'phase5-browser-1789283702224@example.test',
          active: true,
        },
      }),
      0,
    );
  });
} finally {
  for (const cookie of cookies)
    await POST(
      new Request(base + '/api/auth/sign-out/', {
        method: 'POST',
        headers: {
          Origin: base,
          Host: new URL(base).host,
          Cookie: cookie,
          'Content-Type': 'application/json',
          'x-aurelia-proxy-ip': ip,
        },
        body: '{}',
      }),
    );
  if (priorHeader === undefined) delete process.env.AUTH_TRUSTED_IP_HEADER;
  else process.env.AUTH_TRUSTED_IP_HEADER = priorHeader;
  await db.$disconnect();
}
