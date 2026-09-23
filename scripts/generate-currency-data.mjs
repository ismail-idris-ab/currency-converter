/**
 * Regenerates src/data/currencies.ts and src/data/flags.generated.ts from
 * scripts/currencies.source.json plus the circle-flags package.
 *
 * Run with: node scripts/generate-currency-data.mjs
 *
 * Flags are inlined as SVG strings rather than imported as files so the app
 * needs no Metro SVG transformer and the assets cannot go missing at runtime.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';

const SOURCE = new URL('./currencies.source.json', import.meta.url);
const FLAG_DIR = new URL('../node_modules/circle-flags/flags/', import.meta.url);

const list = JSON.parse(readFileSync(SOURCE, 'utf8'));

const missing = list.filter(([, , , flag]) => !existsSync(new URL(`${flag}.svg`, FLAG_DIR)));
if (missing.length > 0) {
  console.error('Missing flag art for:', missing.map(([code, , , flag]) => `${code}->${flag}`).join(', '));
  process.exit(1);
}

const header = `/**
 * Static currency catalogue — generated, do not hand-edit.
 * Run: node scripts/generate-currency-data.mjs
 *
 * \`flagId\` names a bundled circular SVG (see flags.generated.ts). Currencies
 * without a single sovereign issuer borrow a representative flag: EUR uses the
 * EU flag, XOF Senegal, XAF Central African Republic, XCD Antigua, XPF French
 * Polynesia.
 *
 * \`decimals\` follows ISO 4217 minor units, so JPY/KRW render whole numbers and
 * dinars render three places.
 */
export type CurrencyType = 'fiat' | 'crypto';

export interface Currency {
  readonly code: string;
  readonly name: string;
  readonly country: string;
  readonly flagId: string;
  readonly decimals: number;
  readonly type: CurrencyType;
}

export const CURRENCIES: readonly Currency[] = [
`;

const rows = list
  .map(
    ([code, name, country, flag, decimals]) =>
      `  { code: ${JSON.stringify(code)}, name: ${JSON.stringify(name)}, country: ${JSON.stringify(country)}, flagId: ${JSON.stringify(flag)}, decimals: ${decimals}, type: 'fiat' },`,
  )
  .join('\n');

const footer = `
];

const BY_CODE: ReadonlyMap<string, Currency> = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code: string): Currency | undefined {
  return BY_CODE.get(code);
}

/** Currencies shown on a fresh install, per product decision. */
export const DEFAULT_CODES: readonly string[] = ['USD', 'NGN', 'EUR'];
`;

writeFileSync(new URL('../src/data/currencies.ts', import.meta.url), header + rows + footer);

let flags = `/** Circular flag SVGs, inlined at build time. Generated — do not hand-edit.
 * Run: node scripts/generate-currency-data.mjs
 * Source: circle-flags (MIT). Only the flags this app references are included.
 */

export const FLAG_SVG: Readonly<Record<string, string>> = {
`;
const seen = new Set();
for (const [, , , flag] of list) {
  if (seen.has(flag)) continue;
  seen.add(flag);
  const svg = readFileSync(new URL(`${flag}.svg`, FLAG_DIR), 'utf8').trim();
  flags += `  ${JSON.stringify(flag)}: ${JSON.stringify(svg)},\n`;
}
flags += '};\n';

const out = new URL('../src/data/flags.generated.ts', import.meta.url);
writeFileSync(out, flags);

console.log(`currencies: ${list.length}, flags: ${seen.size}, ${(statSync(out).size / 1024).toFixed(0)}KB`);
