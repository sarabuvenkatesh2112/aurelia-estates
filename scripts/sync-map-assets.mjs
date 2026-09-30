import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('public/vendor', { recursive: true });
for (const file of ['maplibre-gl.css', 'maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'])
  copyFileSync(`node_modules/maplibre-gl/dist/${file}`, `public/vendor/${file}`);
copyFileSync('node_modules/maplibre-gl/LICENSE.txt', 'public/vendor/maplibre-LICENSE.txt');
