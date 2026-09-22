import { getDb } from './db';
import { fetchFiatRates, type RateSnapshot } from './api';

/** Where a displayed rate came from. Precedence: custom > parallel > official. */
export type RateSource = 'official' | 'parallel' | 'custom';

export interface CachedRates {
  /** Units of the keyed currency per 1 USD. */
  readonly rates: Readonly<Record<string, number>>;
  /** Epoch millis the cached data was written, or null when the cache is empty. */
  readonly updatedAt: number | null;
}

const EMPTY: CachedRates = { rates: {}, updatedAt: null };

/** Persists a snapshot, replacing any previous rows for the same source. */
export async function saveRates(snapshot: RateSnapshot, source: RateSource = 'official'): Promise<void> {
  const db = await getDb();
  const entries = Object.entries(snapshot.rates);

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM rates WHERE source = ?', [source]);
    for (const [code, rate] of entries) {
      await db.runAsync(
        'INSERT INTO rates (code, source, rate, updated_at) VALUES (?, ?, ?, ?)',
        [code, source, rate, snapshot.fetchedAt],
      );
    }
  });
}

/** Reads cached rates for one source. Returns an empty snapshot if none exist. */
export async function loadRates(source: RateSource = 'official'): Promise<CachedRates> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ code: string; rate: number; updated_at: number }>(
    'SELECT code, rate, updated_at FROM rates WHERE source = ?',
    [source],
  );
  if (rows.length === 0) return EMPTY;

  const rates: Record<string, number> = {};
  let updatedAt = 0;
  for (const row of rows) {
    rates[row.code] = row.rate;
    if (row.updated_at > updatedAt) updatedAt = row.updated_at;
  }
  return { rates, updatedAt };
}

/** Fetches fresh official rates and caches them. Propagates RateFetchError. */
export async function refreshOfficialRates(): Promise<CachedRates> {
  const snapshot = await fetchFiatRates();
  await saveRates(snapshot, 'official');
  return { rates: snapshot.rates, updatedAt: snapshot.fetchedAt };
}

/**
 * Converts between two currencies using USD-based rates.
 * Returns null when either rate is missing, so callers render "—" rather
 * than a confidently wrong number.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: Readonly<Record<string, number>>,
): number | null {
  if (!Number.isFinite(amount)) return null;
  if (from === to) return amount;

  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return null;

  return (amount * toRate) / fromRate;
}
