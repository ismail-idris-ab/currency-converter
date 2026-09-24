/**
 * Own rates — a rate the user types in themselves.
 *
 * This app converts; it does not report the market. When someone knows a rate
 * the official feed does not carry (a street rate, an agent's rate, a rate
 * agreed with a relative), they enter it and the app converts with it. The
 * app never supplies such a number and never implies one can be transacted.
 *
 * A pair is stored once, as base -> quote. The reverse direction is derived,
 * because storing both invites the two halves to disagree.
 */
import { getDb } from './db';

export interface CustomRate {
  readonly base: string;
  readonly quote: string;
  readonly rate: number;
  readonly createdAt: number;
}

/** Rates outside this range are almost certainly typos, not intent. */
const MIN_RATE = 1e-9;
const MAX_RATE = 1e12;

export class InvalidRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRateError';
  }
}

/**
 * Validates a user-entered rate. Returns the parsed number, or throws with a
 * message fit to show directly in the UI.
 */
export function parseRateInput(raw: string): number {
  const cleaned = raw.trim().replace(/,/g, '');
  if (cleaned === '') throw new InvalidRateError('Enter a rate.');
  if (!/^\d*\.?\d*$/.test(cleaned)) throw new InvalidRateError('Use digits and one decimal point.');

  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) throw new InvalidRateError('That is not a number.');
  if (value <= 0) throw new InvalidRateError('A rate must be greater than zero.');
  if (value < MIN_RATE || value > MAX_RATE) throw new InvalidRateError('That rate is out of range.');

  return value;
}

export async function saveCustomRate(base: string, quote: string, rate: number): Promise<void> {
  if (base === quote) throw new InvalidRateError('Pick two different currencies.');
  if (!Number.isFinite(rate) || rate <= 0) throw new InvalidRateError('A rate must be greater than zero.');

  const db = await getDb();
  await db.runAsync(
    `INSERT INTO custom_rates (base, quote, rate, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(base, quote) DO UPDATE SET rate = excluded.rate, created_at = excluded.created_at`,
    [base, quote, rate, Date.now()],
  );
}

export async function deleteCustomRate(base: string, quote: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM custom_rates WHERE base = ? AND quote = ?', [base, quote]);
}

export async function clearCustomRates(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM custom_rates');
}

export async function loadCustomRates(): Promise<readonly CustomRate[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    base: string;
    quote: string;
    rate: number;
    created_at: number;
  }>('SELECT base, quote, rate, created_at FROM custom_rates ORDER BY created_at DESC');

  return rows.map((row) => ({
    base: row.base,
    quote: row.quote,
    rate: row.rate,
    createdAt: row.created_at,
  }));
}

export interface RateOverrides {
  /** Pair overrides keyed "BASE_QUOTE", covering both directions. */
  readonly pairs: Readonly<Record<string, number>>;
  /** USD-based rates with any USD-anchored own rate folded in. */
  readonly rates: Readonly<Record<string, number>>;
  /** Codes whose displayed value comes from an own rate. */
  readonly affected: ReadonlySet<string>;
}

/**
 * Folds own rates into the market table.
 *
 * A rate anchored to USD re-bases that currency everywhere, so setting
 * USD->NGN yourself also changes GBP->NGN. Showing your naira rate on one row
 * and the official one on the next would read as a bug, not a feature.
 *
 * Pairs with no USD leg override only themselves, because there is no
 * consistent way to spread them across the table.
 */
export function applyCustomRates(
  rates: Readonly<Record<string, number>>,
  custom: readonly CustomRate[],
): RateOverrides {
  const nextRates: Record<string, number> = { ...rates };
  const pairs: Record<string, number> = {};
  const affected = new Set<string>();

  for (const entry of custom) {
    pairs[`${entry.base}_${entry.quote}`] = entry.rate;
    pairs[`${entry.quote}_${entry.base}`] = 1 / entry.rate;

    if (entry.base === 'USD') {
      nextRates[entry.quote] = entry.rate;
      affected.add(entry.quote);
    } else if (entry.quote === 'USD') {
      nextRates[entry.base] = 1 / entry.rate;
      affected.add(entry.base);
    }
    /*
     * A pair with no USD leg deliberately does NOT join `affected`. It changes
     * that one pair and nothing else, and `pairs` already covers it. Marking
     * its currencies here made GBP->AMD claim "Your rate" on the strength of a
     * GBP->NGN entry that had no bearing on the number shown.
     */
  }

  return { pairs, rates: nextRates, affected };
}

/**
 * Converts using own rates first, then the (already re-based) market table.
 * Returns null when no rate covers the pair, so callers show a dash rather
 * than a confidently wrong number.
 */
export function convertWithOverrides(
  amount: number,
  from: string,
  to: string,
  overrides: RateOverrides,
): number | null {
  if (!Number.isFinite(amount)) return null;
  if (from === to) return amount;

  const direct = overrides.pairs[`${from}_${to}`];
  if (direct !== undefined) return amount * direct;

  const fromRate = overrides.rates[from];
  const toRate = overrides.rates[to];
  if (!fromRate || !toRate) return null;

  return (amount * toRate) / fromRate;
}

/** True when this conversion used an own rate rather than the market. */
export function usesCustomRate(from: string, to: string, overrides: RateOverrides): boolean {
  if (from === to) return false;
  if (overrides.pairs[`${from}_${to}`] !== undefined) return true;
  return overrides.affected.has(from) || overrides.affected.has(to);
}
