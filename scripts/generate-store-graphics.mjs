/**
 * Generates the Play Store graphics from the same vector mark as the app
 * icon, so the listing and the launcher never drift apart:
 *
 *   node scripts/generate-store-graphics.mjs
 *
 * Output lands in store/, which is listing material rather than app assets
 * and is deliberately kept out of assets/images.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.join(process.cwd(), 'store');
const BRAND = '#0B3B2E';
const ACCENT = '#34C79A';

/** The exchange arrows, identical geometry to the launcher icon. */
function mark(color, scale = 1, stroke = 34) {
  const t = (1 - scale) * 256;
  return `
    <g transform="translate(${t} ${t}) scale(${scale})"
       fill="none" stroke="${color}" stroke-width="${stroke}"
       stroke-linecap="round" stroke-linejoin="round">
      <path d="M120 196 H392" />
      <path d="M336 140 L392 196 L336 252" />
      <path d="M392 316 H120" />
      <path d="M176 260 L120 316 L176 372" />
    </g>`;
}

/*
 * Play crops the feature graphic differently across surfaces, so nothing that
 * matters goes near the edges: the mark and the words sit inside the middle
 * band with generous margins.
 */
const feature = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B3B2E" />
      <stop offset="100%" stop-color="#062119" />
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)" />
  <g transform="translate(96 122) scale(0.50)">${mark('#FFFFFF', 1, 30)}</g>
  <text x="392" y="228"
        font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        font-size="62" font-weight="700" fill="#FFFFFF">All Currency</text>
  <text x="392" y="300"
        font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        font-size="62" font-weight="700" fill="${ACCENT}">Converter</text>
  <text x="394" y="350"
        font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        font-size="25" fill="#BFD8CE">150+ currencies · works offline · built-in calculator</text>
</svg>`;

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${BRAND}" />
  ${mark('#FFFFFF', 0.78)}
</svg>`;

await mkdir(OUT, { recursive: true });

await sharp(Buffer.from(feature)).png().toFile(path.join(OUT, 'feature-graphic.png'));
await sharp(Buffer.from(icon)).resize(512, 512).png().toFile(path.join(OUT, 'icon-512.png'));

console.log('store/feature-graphic.png 1024x500\nstore/icon-512.png 512x512');
