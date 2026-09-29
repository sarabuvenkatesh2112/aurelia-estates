import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'dotenv';
const secrets = [];
for (const path of [
  '.env',
  '.env.local',
  '.env.neon',
  '.env.auth',
  '.env.ai',
]) {
  if (!existsSync(path)) continue;
  for (const [name, value] of Object.entries(parse(readFileSync(path)))) {
    // The Maps browser key is intentionally public and must be referrer/API restricted.
    if (
      !name.startsWith('NEXT_PUBLIC_') &&
      /SECRET|PASSWORD|TOKEN|DATABASE_URL|DIRECT_URL|API_KEY/.test(name) &&
      value.length >= 12
    )
      secrets.push(value);
  }
}
const files = (path) =>
  readdirSync(path, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(path, e.name)) : [join(path, e.name)],
  );
const client = files('.next/static'),
  assets = files('public');
let failures = 0;
for (const path of [...client, ...assets]) {
  const content = readFileSync(path, 'utf8');
  if (
    secrets.some((value) => content.includes(value)) ||
    /GOOGLE_MAPS_SERVER_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY|META_APP_SECRET|WHATSAPP_ACCESS_TOKEN|BETTER_AUTH_SECRET|DATABASE_URL|DIRECT_URL|postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@/.test(
      content,
    )
  )
    failures++;
}
console.log(
  JSON.stringify({
    clientFiles: client.length,
    publicFiles: assets.length,
    secretMatches: failures,
  }),
);
if (failures) process.exitCode = 1;
