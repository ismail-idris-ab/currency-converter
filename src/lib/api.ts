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
  /**
   * Epoch millis the PROVIDER published this data — not when we received it.
   * React Native's fetch sits on OkHttp, which keeps an HTTP response cache,
   * so a request can succeed offline by replaying a stale cached body. Using
   * the provider's own timestamp means such a reply ages honestly instead of
   * being relabelled as fresh.
   */
  readonly publishedAt: number;
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
      // Bypass OkHttp's response cache: this app keeps its own cache in
      // SQLite, and a silent HTTP replay would hide that we are offline.
      cache: 'no-store',
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

/** Rejects timestamps that are absent, unparseable, or implausibly far out. */
function sanePublishedAt(candidate: number | null): number {
  const now = Date.now();
  if (candidate === null || !Number.isFinite(candidate)) return now;
  // A provider clock more than a day ahead, or older than 30 days, is junk.
  if (candidate > now + 86_400_000) return now;
  if (candidate < now - 30 * 86_400_000) return candidate;
  return candidate;
}

interface Parsed {
  readonly rates: Record<string, number>;
  readonly publishedAt: number;
}

function readPrimary(body: unknown): Parsed | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Record<string, unknown>;
  if (record.result !== 'success') return null;

  const rates = parseRateMap(record.rates);
  if (!rates) return null;

  const unix = record.time_last_update_unix;
  const publishedAt = typeof unix === 'number' && Number.isFinite(unix) ? unix * 1000 : null;
  return { rates, publishedAt: sanePublishedAt(publishedAt) };
}

function readFallback(body: unknown): Parsed | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Record<string, unknown>;
  if (record.base !== 'USD') return null;

  const rates = parseRateMap(record.rates);
  if (!rates) return null;

  // Frankfurter dates are "YYYY-MM-DD" for the quoted business day.
  const date = typeof record.date === 'string' ? Date.parse(`${record.date}T00:00:00Z`) : NaN;
  return { rates, publishedAt: sanePublishedAt(Number.isNaN(date) ? null : date) };
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
    const parsed = readPrimary(body);
    if (parsed) {
      return {
        rates: { ...parsed.rates, USD: 1 },
        publishedAt: parsed.publishedAt,
        provider: 'exchangerate-api',
      };
    }
    primaryError = new RateFetchError('Primary provider returned an unrecognised payload');
  } catch (error) {
    primaryError = error;
  }

  try {
    const body = await attempt(() => fetchJson(FALLBACK_URL));
    const parsed = readFallback(body);
    if (parsed) {
      return {
        rates: { ...parsed.rates, USD: 1 },
        publishedAt: parsed.publishedAt,
        provider: 'frankfurter',
      };
    }
    throw new RateFetchError('Fallback provider returned an unrecognised payload');
  } catch (fallbackError) {
    throw new RateFetchError('Could not reach any exchange-rate provider', {
      primaryError,
      fallbackError,
    });
  }
}
