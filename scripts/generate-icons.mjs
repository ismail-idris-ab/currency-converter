/**
 * Generates the launcher icon, adaptive-icon layers and splash mark from one
 * vector source, so every size stays identical and can be regenerated:
 *
 *   node scripts/generate-icons.mjs
 *
 * The artwork lives in scripts/lib/icon-art.mjs and is shared with the store
 * graphics.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import { iconSvg, layerSvg } from './lib/icon-art.mjs';

const OUT = path.join(process.cwd(), 'assets', 'images');

async function png(name, markup, size) {
  await sharp(Buffer.from(markup)).resize(size, size).png().toFile(path.join(OUT, name));
  return `${name} ${size}x${size}`;
}

await mkdir(OUT, { recursive: true });

const written = [
  // Full-bleed launcher icon for devices without adaptive icons, and the
  // source for the 512px Play listing icon.
  await png('icon.png', iconSvg(1024), 1024),
  // Adaptive foreground: Android crops to a circle and animates the layer, so
  // the face sits inside the 66% safe zone with transparency around it.
  await png('android-icon-foreground.png', layerSvg({ scale: 0.80 }), 1024),
  // Themed icons are tinted by the launcher, so this layer is shape only.
  await png('android-icon-monochrome.png', layerSvg({ scale: 0.80, mono: true }), 1024),
  // Splash draws on the brand background set in app.json. Android 12's splash
  // API masks the image to a circle, so the face stays well inside it.
  await png('splash-icon.png', layerSvg({ scale: 0.70 }), 512),
];

await writeFile(path.join(OUT, 'icon.svg'), iconSvg(512));

console.log(written.join('\n'));
