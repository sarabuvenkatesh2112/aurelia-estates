import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
const dir = 'public/images';
for (const file of (await readdir(dir)).filter((f) => f.endsWith('.jpg'))) {
  const name = file.slice(0, -4);
  for (const width of [640, 1200, 1800]) {
    await sharp(join(dir, file))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toFile(join(dir, `${name}${width === 1800 ? '' : `-${width}`}.webp`));
  }
  console.log(`Optimized ${name}`);
}
