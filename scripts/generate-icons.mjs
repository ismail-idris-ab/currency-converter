/**
 * Generates the launcher icon, adaptive-icon layers and splash mark from one
 * vector source, so every size stays identical and can be regenerated:
 *
 *   node scripts/generate-icons.mjs
 *
 * The mark is a pair of exchange arrows — pure geometry, no currency letter.
 * A "$" would claim a currency the app does not favour, and letters turn to
 * mush at 48dp anyway.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.join(process.cwd(), 'assets', 'images');
const BRAND = '#0B3B2E';

/** Exchange arrows on a 512 viewBox, drawn with `color` strokes. */
function mark(color, scale = 1) {
  const t = (1 - scale) * 256;
  return `
    <g transform="translate(${t} ${t}) scale(${scale})"
       fill="none" stroke="${color}" stroke-width="34"
       stroke-linecap="round" stroke-linejoin="round">
      <path d="M120 196 H392" />
      <path d="M336 140 L392 196 L336 252" />
      <path d="M392 316 H120" />
      <path d="M176 260 L120 316 L176 372" />
    </g>`;
}

function svg({ background, color, scale }) {
  const bg = background ? `<rect width="512" height="512" fill="${background}" />` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${bg}${mark(color, scale)}</svg>`;
}

async function png(name, markup, size) {
  const file = path.join(OUT, name);
  await sharp(Buffer.from(markup)).resize(size, size).png().toFile(file);
  return `${name} ${size}x${size}`;
}

await mkdir(OUT, { recursive: true });

const written = [
  // Full-bleed launcher icon for devices without adaptive icons.
  await png('icon.png', svg({ background: BRAND, color: '#FFFFFF', scale: 0.78 }), 1024),
  // Adaptive foreground: Android crops to a circle and animates the layer, so
  // the mark sits inside the 66% safe zone with transparency around it.
  await png('android-icon-foreground.png', svg({ color: '#FFFFFF', scale: 0.66 }), 1024),
  // Themed icons are tinted by the launcher, so this layer is shape only.
  await png('android-icon-monochrome.png', svg({ color: '#FFFFFF', scale: 0.66 }), 1024),
  // Splash draws on the brand background set in app.json. Android 12's splash
  // API masks the image to a circle, so the mark stays well inside it.
  await png('splash-icon.png', svg({ color: '#FFFFFF', scale: 0.55 }), 512),
];

await writeFile(path.join(OUT, 'icon.svg'), svg({ background: BRAND, color: '#FFFFFF', scale: 0.78 }));

console.log(written.join('\n'));
