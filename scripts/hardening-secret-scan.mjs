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
    if (
      /SECRET|PASSWORD|TOKEN|DATABASE_URL|DIRECT_URL|API_KEY/.test(name) &&
      value.length >= 12
    ) {
      secrets.push(value);
      if (/DATABASE_URL|DIRECT_URL/.test(name)) {
        try {
          const password = decodeURIComponent(new URL(value).password);
          if (password.length >= 12) secrets.push(password);
        } catch {
          /* Not a URL. */
        }
      }
    }
  }
}
const files = (path) =>
  existsSync(path)
    ? readdirSync(path, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? files(join(path, e.name)) : [join(path, e.name)],
      )
    : [];
const source = ['app', 'components', 'hooks', 'lib']
  .flatMap(files)
  .filter(
    (path) =>
      /\.[cm]?[jt]sx?$/.test(path) &&
      /^['"]use client['"]/m.test(readFileSync(path, 'utf8')),
  );
const exposed = [...source, ...files('public'), ...files('.next/static')];
const forbidden =
  /OPENROUTESERVICE_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY|META_APP_SECRET|WHATSAPP_ACCESS_TOKEN|WHATSAPP_VERIFY_TOKEN|BETTER_AUTH_SECRET|DATABASE_URL|DIRECT_URL|postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@/;
let matches = 0;
for (const path of exposed) {
  const content = readFileSync(path, 'utf8');
  if (
    secrets.some((value) => content.includes(value)) ||
    forbidden.test(content)
  )
    matches++;
}
const server = files('.next/server');
for (const path of server) {
  const content = readFileSync(path, 'utf8');
  if (secrets.some((value) => content.includes(value))) matches++;
}
console.log(
  JSON.stringify({
    clientSourceFiles: source.length,
    publicAndClientBuildFiles: exposed.length - source.length,
    serverBuildFiles: server.length,
    secretMatches: matches,
  }),
);
if (matches) process.exitCode = 1;
