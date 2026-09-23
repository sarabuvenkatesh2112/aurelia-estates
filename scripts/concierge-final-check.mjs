import './database-env.mjs';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'dotenv';
const secretValues = [];
for (const file of ['.env', '.env.local', '.env.neon', '.env.auth', '.env.ai'])
  if (existsSync(file)) {
    const env = parse(readFileSync(file));
    for (const [key, value] of Object.entries(env))
      if (
        /SECRET|PASSWORD|TOKEN|DATABASE_URL|DIRECT_URL|API_KEY/.test(key) &&
        value.length >= 12
      )
        secretValues.push(value);
  }
function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(path, e.name)) : [join(path, e.name)],
  );
}
const clientFiles = files('.next/static').filter((p) =>
  /\.(js|json|css)$/.test(p),
);
let matches = 0;
for (const path of clientFiles) {
  const text = readFileSync(path, 'utf8');
  if (
    secretValues.some((v) => text.includes(v)) ||
    /WHATSAPP_ACCESS_TOKEN|META_APP_SECRET|WHATSAPP_VERIFY_TOKEN|DATABASE_URL|DIRECT_URL|GEMINI_API_KEY|AURELIA_GEMINI_MODEL|OPENAI_API_KEY|AURELIA_AI_MODEL|postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@/.test(
      text,
    )
  )
    matches++;
}
console.log(
  JSON.stringify({
    clientFiles: clientFiles.length,
    credentialMatches: matches,
  }),
);
if (matches) process.exitCode = 1;
if (process.argv.includes('--scan-only')) process.exit(process.exitCode || 0);
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const checks = [];
for (const path of [
  '/',
  '/residences/',
  '/residences/the-eastern-grove/',
  '/sign-in/',
  '/api/search/?city=Visakhapatnam&bhk=3&maxPrice=20000000',
  '/api/admin/leads/',
]) {
  const response = await fetch(base + path, { redirect: 'follow' });
  const body = await response.text();
  const expected = path.startsWith('/api/admin') ? [401, 403] : [200];
  checks.push({
    path,
    status: response.status,
    passed:
      expected.includes(response.status) &&
      !body.includes('Application error:'),
  });
}
console.log(JSON.stringify({ regressionReads: checks }));
if (checks.some((c) => !c.passed)) process.exitCode = 1;
