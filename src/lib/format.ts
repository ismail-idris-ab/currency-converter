import { getCurrency } from '@/data/currencies';

/**
 * Formats a converted amount for display.
 *
 * Decimal places follow the currency (JPY 0, most fiat 2), except that very
 * small non-zero results keep enough precision to stay meaningful instead of
 * collapsing to "0.00".
 */
export function formatAmount(value: number, code: string, grouping = true): string {
  if (!Number.isFinite(value)) return '—';

  const base = getCurrency(code)?.decimals ?? 2;
  let decimals = base;
  if (value !== 0 && Math.abs(value) < 0.01) {
    decimals = Math.min(8, base + 6);
  } else if (Math.abs(value) >= 1_000_000) {
    decimals = 0;
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
    useGrouping: grouping,
  });
}

/** "Just now", "5 min ago", "3 days ago" — null timestamp means no data yet. */
export function formatAge(updatedAt: number | null, now = Date.now()): string {
  if (updatedAt === null) return 'No data yet';

  const seconds = Math.max(0, Math.floor((now - updatedAt) / 1000));
  if (seconds < 90) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;

  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

/**
 * Rates older than a day are still worth converting with, but the user has to
 * be told: a day-old naira number can be far off. The threshold is generous
 * because the providers themselves publish roughly daily.
 */
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export function isStale(updatedAt: number | null, now = Date.now()): boolean {
  return updatedAt !== null && now - updatedAt > STALE_AFTER_MS;
}
