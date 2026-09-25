/**
 * The icon artwork, shared by the launcher icons and the store graphics so
 * the two can never drift apart.
 *
 * The mark is a calculator face: a readout above a keypad of currency symbols
 * with two accent keys. It says "convert money" and "do sums" at once, which
 * is what the app is, and it survives being shrunk because the shapes are
 * large and the glyphs are few.
 */
export const BRAND_DARK = '#0B3B2E';
export const BRAND_DEEP = '#062119';
export const ACCENT = '#34C79A';

const FONT = 'Segoe UI, Roboto, DejaVu Sans, Helvetica, Arial, sans-serif';

/** A rounded key with a glyph centred in it. */
function key(x, y, size, radius, fill, glyph, glyphFill, glyphSize, glyphs = true) {
  if (!glyphs) {
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fill}" />`;
  }

  return `
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fill}" />
    <text x="${x + size / 2}" y="${y + size / 2}"
          font-family="${FONT}" font-size="${glyphSize}" font-weight="600"
          fill="${glyphFill}" text-anchor="middle" dominant-baseline="central">${glyph}</text>`;
}

/**
 * The calculator face on a 512 viewBox.
 *
 * `onDark` inverts the key treatment: over the brand background the keys are
 * translucent white, while the standalone layers draw them solid so they read
 * against whatever the launcher puts behind them.
 */
export function face({ scale = 1, solid = false, glyphs = true } = {}) {
  const t = (1 - scale) * 256;
  const keyFill = solid ? '#FFFFFF' : 'rgba(255,255,255,0.16)';
  const glyphFill = solid ? BRAND_DARK : '#FFFFFF';

  const size = 104;
  const gap = 20;
  const left = 88;
  const top = 224;
  const radius = 26;

  const col = (i) => left + i * (size + gap);
  const row = (i) => top + i * (size + gap);

  /*
   * The drawing's own bounds run x 88..440 and y 108..452, so its centre is
   * (264, 280) rather than (256, 256). Without this nudge every scaled layer
   * sits low and to the right of the canvas centre.
   */
  return `
    <g transform="translate(${t} ${t}) scale(${scale}) translate(-8 -24)">
      <rect x="${left}" y="108" width="${size * 3 + gap * 2}" height="88" rx="24" fill="#FFFFFF" />
      ${glyphs ? `<text x="${left + size * 3 + gap * 2 - 26}" y="154"
            font-family="${FONT}" font-size="62" font-weight="700"
            fill="${BRAND_DARK}" text-anchor="end" dominant-baseline="central">100</text>` : ''}

      ${key(col(0), row(0), size, radius, keyFill, '$', glyphFill, 60, glyphs)}
      ${key(col(1), row(0), size, radius, keyFill, '&#8364;', glyphFill, 60, glyphs)}
      ${key(col(2), row(0), size, radius, ACCENT, '+', '#FFFFFF', 64, glyphs)}

      ${key(col(0), row(1), size, radius, keyFill, '&#165;', glyphFill, 60, glyphs)}
      ${key(col(1), row(1), size, radius, keyFill, '&#163;', glyphFill, 60, glyphs)}
      ${key(col(2), row(1), size, radius, ACCENT, '=', '#FFFFFF', 64, glyphs)}
    </g>`;
}

/** Full-bleed artwork: brand panel with the face on top. */
export function iconSvg(size = 512) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND_DARK}" />
      <stop offset="100%" stop-color="${BRAND_DEEP}" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" />
  ${face({ scale: 0.86 })}
</svg>`;
}

/**
 * Layer artwork with no background, for the adaptive foreground, the
 * monochrome layer and the splash. Android crops the adaptive layers to a
 * circle and animates them, so the face stays inside the 66% safe zone.
 */
export function layerSvg({ scale = 0.62, mono = false, size = 512 } = {}) {
  /*
   * The themed layer is tinted wholesale by the launcher, so every opaque
   * pixel becomes one colour. Glyphs would vanish into a solid blob, which is
   * why the monochrome variant is the keypad's shapes alone.
   */
  const inner = mono
    ? face({ scale, glyphs: false })
        .split('rgba(255,255,255,0.16)').join('#FFFFFF')
        .split(ACCENT).join('#FFFFFF')
    : face({ scale });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">${inner}</svg>`;
}
