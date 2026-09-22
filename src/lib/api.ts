/**
 * Exchange-rate fetching.
 *
 * All rates are normalised to a USD base: `rates[CODE]` is how many units of
 * CODE one USD buys. Primary source is ExchangeRate-API; Frankfurter is the
 * fallback. Both are HTTPS-only and every response is shape-validated before
 * it is allowed anywhere near the database.
 */

const PRIMARY_URL = 'https://open.er-api.com/v6/latest/USD';
const FALLBACK_URL = 'https://api.frankfurter.app/latest?from=USD';
const TIMEOUT_MS = 10_000;

export interface RateSnapshot {
  /** Units of the keyed currency per 1 USD. */
  readonly rates: Readonly<Record<string, number>>;
  /** Epoch millis the provider published this data. */
  readonly fetchedAt: number;
  readonly provider: 'exchangerate-api' | 'frankfurter';
}

export class RateFetchError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'RateFetchError';
  }
}

async function fetchJson(url: string): Promise<unknown> {
  if (!url.startsWith('https://')) {
    throw new RateFetchError(`Refusing non-HTTPS request to ${url}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new RateFetchError(`${url} responded ${response.status}`);
    }
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof RateFetchError) throw error;
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new RateFetchError(aborted ? `${url} timed out` : `${url} request failed`, error);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Accepts a parsed body only if it really is a map of currency code to a
 * finite positive number. Anything odd is dropped rather than trusted.
 */
function parseRateMap(value: unknown): Record<string, number> | null {
  if (typeof value !== 'object' || value === null) return null;

  const out: Record<string, number> = {};
  for (const [code, rate] of Object.entries(value as Record<string, unknown>)) {
    if (!/^[A-Z]{3,6}$/.test(code)) continue;
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) continue;
    out[code] = rate;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function readPrimary(body: unknown): Record<string, number> | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Record<string, unknown>;
  if (record.result !== 'success') return null;
  return parseRateMap(record.rates);
}

function readFallback(body: unknown): Record<string, number> | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Record<string, unknown>;
  if (record.base !== 'USD') return null;
  return parseRateMap(record.rates);
}

async function attempt<T>(task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch {
    // One retry: these endpoints fail transiently on flaky mobile networks.
    return await task();
  }
}

/**
 * Fetches fiat rates, trying the primary provider then the fallback.
 * Throws RateFetchError only when both providers fail.
 */
export async function fetchFiatRates(): Promise<RateSnapshot> {
  let primaryError: unknown;

  try {
    const body = await attempt(() => fetchJson(PRIMARY_URL));
    const rates = readPrimary(body);
    if (rates) {
      return { rates: { ...rates, USD: 1 }, fetchedAt: Date.now(), provider: 'exchangerate-api' };
    }
    primaryError = new RateFetchError('Primary provider returned an unrecognised payload');
  } catch (error) {
    primaryError = error;
  }

  try {
    const body = await attempt(() => fetchJson(FALLBACK_URL));
    const rates = readFallback(body);
    if (rates) {
      return { rates: { ...rates, USD: 1 }, fetchedAt: Date.now(), provider: 'frankfurter' };
    }
    throw new RateFetchError('Fallback provider returned an unrecognised payload');
  } catch (fallbackError) {
    throw new RateFetchError(
      'Could not reach any exchange-rate provider',
      { primaryError, fallbackError },
    );
  }
}
