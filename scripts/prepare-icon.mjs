import sharp from 'sharp';
import { renameSync } from 'node:fs';
import { resolve } from 'node:path';

const iconPath = resolve(import.meta.dirname, '../assets/icon.png');
const tmpPath = resolve(import.meta.dirname, '../assets/icon.tmp.png');

const { width, height } = await sharp(iconPath).metadata();
if (width === height) {
  process.exit(0);
}

await sharp(iconPath)
  .resize(Math.min(width, height), Math.min(width, height), {
    fit: 'cover',
    position: 'center',
  })
  .toFile(tmpPath);

renameSync(tmpPath, iconPath);
console.log(`[prepare-icon] Cropped ${width}x${height} icon to square`);
