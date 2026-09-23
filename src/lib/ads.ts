/**
 * Ad units, consent and the interstitial policy.
 *
 * Real unit IDs never ship in the source: production builds inject them
 * through EXPO_PUBLIC_ADMOB_* and every other build falls back to Google's
 * test units. Serving live ads to yourself during development is how
 * accounts get suspended for invalid traffic.
 */
import mobileAds, { AdsConsent, TestIds } from 'react-native-google-mobile-ads';

import { getDb } from '@/lib/db';

function unit(envValue: string | undefined, testId: string): string {
  if (__DEV__) return testId;
  // A production build with a missing or malformed ID falls back to the test
  // unit rather than requesting against a wrong account.
  return envValue && /^ca-app-pub-\d+\/\d+$/.test(envValue) ? envValue : testId;
}

export const BANNER_UNIT_ID = unit(process.env.EXPO_PUBLIC_ADMOB_BANNER, TestIds.BANNER);
export const INTERSTITIAL_UNIT_ID = unit(
  process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL,
  TestIds.INTERSTITIAL,
);

let started = false;

/**
 * Gathers UMP consent, then starts the SDK only if ads may be requested.
 * Consent is re-checked every launch because it expires and providers change.
 * A failure here is never fatal: the app is a converter first, and it must
 * work with no ads at all.
 */
export async function startAds(): Promise<boolean> {
  try {
    await AdsConsent.gatherConsent();
  } catch {
    // Form unavailable or dismissed — fall through and ask the SDK itself.
  }

  try {
    const { canRequestAds } = await AdsConsent.getConsentInfo();
    if (!canRequestAds || started) return started;

    started = true;
    await mobileAds().initialize();
    return true;
  } catch {
    return false;
  }
}

export function adsStarted(): boolean {
  return started;
}

/* -------------------------------------------------------------------------
 * Interstitial policy
 *
 * Interstitials pay, but a converter is used in seconds-long bursts, often
 * mid-conversation about money. The limits below are deliberately tighter
 * than AdMob allows: one per session, three a day, never inside three
 * minutes of the last, and never while a calculation is unfinished.
 * ---------------------------------------------------------------------- */

export const MIN_INTERSTITIAL_GAP_MS = 3 * 60 * 1000;
export const MAX_INTERSTITIALS_PER_DAY = 3;

const KEY_DAY = 'ads.interstitial.day';
const KEY_COUNT = 'ads.interstitial.count';
const KEY_LAST = 'ads.interstitial.lastShownAt';

/** Local calendar day, so the cap resets at the user's midnight, not UTC. */
export function dayKey(at: number): string {
  const date = new Date(at);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

async function readSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

async function writeSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export interface InterstitialQuota {
  readonly shownToday: number;
  readonly lastShownAt: number | null;
}

export async function readQuota(now = Date.now()): Promise<InterstitialQuota> {
  const [day, count, last] = await Promise.all([
    readSetting(KEY_DAY),
    readSetting(KEY_COUNT),
    readSetting(KEY_LAST),
  ]);

  // A stored day other than today means the counter belongs to a past day.
  const shownToday = day === dayKey(now) ? Number.parseInt(count ?? '0', 10) : 0;
  const lastShownAt = last === null ? null : Number.parseInt(last, 10);

  return {
    shownToday: Number.isFinite(shownToday) ? shownToday : 0,
    lastShownAt: lastShownAt !== null && Number.isFinite(lastShownAt) ? lastShownAt : null,
  };
}

export async function recordShown(now = Date.now()): Promise<void> {
  const quota = await readQuota(now);
  await Promise.all([
    writeSetting(KEY_DAY, dayKey(now)),
    writeSetting(KEY_COUNT, String(quota.shownToday + 1)),
    writeSetting(KEY_LAST, String(now)),
  ]);
}

export interface InterstitialContext {
  /** Already shown one this app session. */
  readonly shownThisSession: boolean;
  /** True while the keypad holds an unfinished expression. */
  readonly midCalculation: boolean;
  readonly quota: InterstitialQuota;
  readonly now: number;
}

/** Pure predicate, so the policy can be reasoned about without the SDK. */
export function mayShowInterstitial(context: InterstitialContext): boolean {
  if (context.shownThisSession) return false;
  if (context.midCalculation) return false;
  if (context.quota.shownToday >= MAX_INTERSTITIALS_PER_DAY) return false;

  const { lastShownAt } = context.quota;
  if (lastShownAt !== null && context.now - lastShownAt < MIN_INTERSTITIAL_GAP_MS) return false;

  return true;
}

/* -------------------------------------------------------------------------
 * Trigger counting
 *
 * The interstitial is tied to currency selection, not to conversion: picking
 * a currency is a deliberate pause, whereas interrupting someone mid-typing
 * would be hostile. Four selections is the cadence, and the policy above
 * still has the final say.
 * ---------------------------------------------------------------------- */

export const SELECTIONS_PER_INTERSTITIAL = 4;

let selections = 0;

export function noteCurrencySelection(): void {
  selections += 1;
}

export function selectionTriggerReady(): boolean {
  return selections >= SELECTIONS_PER_INTERSTITIAL;
}

export function resetSelectionTrigger(): void {
  selections = 0;
}
