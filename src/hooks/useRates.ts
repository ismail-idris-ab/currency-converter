import { useCallback, useEffect, useRef, useState } from 'react';

import { RateFetchError } from '@/lib/api';
import { loadRates, refreshOfficialRates, type CachedRates } from '@/lib/rateCache';

export type RatesStatus = 'loading' | 'ready' | 'empty' | 'error';

/** 'throttled' means nothing was attempted; the caller should say so. */
export type RefreshOutcome = 'updated' | 'failed' | 'throttled';

export interface UseRatesResult {
  readonly rates: Readonly<Record<string, number>>;
  readonly updatedAt: number | null;
  readonly status: RatesStatus;
  readonly refreshing: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<RefreshOutcome>;
}

const EMPTY: CachedRates = { rates: {}, updatedAt: null };

/**
 * The providers publish roughly daily, so hammering refresh cannot produce
 * newer numbers — it only burns the free quota and the user's data. One call
 * per five minutes is far more than the data ever changes.
 */
const MIN_REFRESH_GAP_MS = 5 * 60 * 1000;

/**
 * Loads cached rates first so the screen renders offline, then refreshes in
 * the background. A failed refresh never discards cached data.
 */
export function useRates(autoRefresh = true): UseRatesResult {
  const [cached, setCached] = useState<CachedRates>(EMPTY);
  const [status, setStatus] = useState<RatesStatus>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastAttemptAt = useRef<number | null>(null);

  const refresh = useCallback(async (): Promise<RefreshOutcome> => {
    const since = lastAttemptAt.current;
    // A failed attempt still counts: retrying a dead network in a tight loop
    // is exactly the case the limit exists for.
    if (since !== null && Date.now() - since < MIN_REFRESH_GAP_MS) return 'throttled';
    lastAttemptAt.current = Date.now();

    setRefreshing(true);
    setError(null);
    try {
      const fresh = await refreshOfficialRates();
      setCached(fresh);
      setStatus('ready');
      return 'updated';
    } catch (cause) {
      const offline = cause instanceof RateFetchError;
      setError(offline ? 'No connection — showing saved rates' : 'Could not update rates');
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
      return 'failed';
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
      // A user who turned automatic refresh off still gets cached rates on
      // open; only the network call is skipped.
      if (active && autoRefresh) await refresh();
    })();

    return () => {
      active = false;
    };
  }, [refresh, autoRefresh]);

  return { rates: cached.rates, updatedAt: cached.updatedAt, status, refreshing, error, refresh };
}
