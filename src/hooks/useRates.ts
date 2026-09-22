import { useCallback, useEffect, useState } from 'react';

import { RateFetchError } from '@/lib/api';
import { loadRates, refreshOfficialRates, type CachedRates } from '@/lib/rateCache';

export type RatesStatus = 'loading' | 'ready' | 'empty' | 'error';

export interface UseRatesResult {
  readonly rates: Readonly<Record<string, number>>;
  readonly updatedAt: number | null;
  readonly status: RatesStatus;
  readonly refreshing: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
}

const EMPTY: CachedRates = { rates: {}, updatedAt: null };

/**
 * Loads cached rates first so the screen renders offline, then refreshes in
 * the background. A failed refresh never discards cached data.
 */
export function useRates(): UseRatesResult {
  const [cached, setCached] = useState<CachedRates>(EMPTY);
  const [status, setStatus] = useState<RatesStatus>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const fresh = await refreshOfficialRates();
      setCached(fresh);
      setStatus('ready');
    } catch (cause) {
      const offline = cause instanceof RateFetchError;
      setError(offline ? 'No connection — showing saved rates' : 'Could not update rates');
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const stored = await loadRates('official');
        if (!active) return;
        if (stored.updatedAt !== null) {
          setCached(stored);
          setStatus('ready');
        } else {
          setStatus('empty');
        }
      } catch {
        if (active) setStatus('error');
      }
      if (active) await refresh();
    })();

    return () => {
      active = false;
    };
  }, [refresh]);

  return { rates: cached.rates, updatedAt: cached.updatedAt, status, refreshing, error, refresh };
}
