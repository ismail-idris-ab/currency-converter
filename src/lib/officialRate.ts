/**
 * Naira adjustment.
 *
 * The USD->NGN rate the feed publishes is rounded up to a whole naira and a
 * fixed amount is added on top, so the converter shows a number nearer to
 * what people actually pay. The amount is a setting rather than a constant
 * because the gap it stands in for moves.
 *
 * It is applied to the USD-based table before own rates are folded in, so
 * every naira pair moves together and a rate the user typed still wins.
 */
export const DEFAULT_NGN_ADJUSTMENT = 30;

/** Anything past this is a typo, not an intent. */
export const MAX_NGN_ADJUSTMENT = 100_000;

/** Whole naira, never negative, never past the ceiling. */
export function sanitizeAdjustment(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.floor(value), MAX_NGN_ADJUSTMENT);
}

/**
 * Rounds up to a whole naira, then adds the adjustment. The rounding happens
 * even when the adjustment is zero: kobo in a naira rate is noise at these
 * magnitudes, and a rate that changes shape when the setting hits zero would
 * be harder to explain than one that does not.
 */
export function adjustNgn(rate: number, adjustment: number): number {
  return Math.ceil(rate) + sanitizeAdjustment(adjustment);
}

/**
 * Returns the table with NGN adjusted. A missing or nonsense NGN rate is left
 * exactly as found, because inventing one would be worse than showing none.
 */
export function applyNgnAdjustment(
  rates: Readonly<Record<string, number>>,
  adjustment: number,
): Readonly<Record<string, number>> {
  const ngn = rates.NGN;
  if (ngn === undefined || !Number.isFinite(ngn) || ngn <= 0) return rates;

  return { ...rates, NGN: adjustNgn(ngn, adjustment) };
}
