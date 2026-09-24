import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';

import {
  INTERSTITIAL_UNIT_ID,
  adsStarted,
  mayShowInterstitial,
  readQuota,
  recordShown,
  resetSelectionTrigger,
  subscribeAdsStarted,
} from '@/lib/ads';

export interface UseInterstitialResult {
  /**
   * Shows the ad if every policy check passes. Returns whether it was shown,
   * so the caller can leave the trigger armed when it was not.
   */
  readonly showIfAllowed: (midCalculation: boolean) => Promise<boolean>;
}

/**
 * Keeps one interstitial preloaded so it can appear instantly or not at all —
 * a spinner between a tap and an ad is the worst of both.
 */
export function useInterstitial(): UseInterstitialResult {
  const adRef = useRef<InterstitialAd | null>(null);
  const loadedRef = useRef(false);
  const shownThisSessionRef = useRef(false);

  /*
   * Consent and SDK init finish seconds after mount, so this waits for the
   * SDK rather than reading a flag once: an earlier version built nothing at
   * all and no interstitial ever appeared for the whole session.
   */
  const ready = useSyncExternalStore(subscribeAdsStarted, adsStarted, () => false);

  useEffect(() => {
    if (!ready) return;

    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID);
    adRef.current = ad;

    const offLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      loadedRef.current = true;
    });
    // A failed load is not worth retrying in a loop; the next session tries
    // again, and the app never depends on an ad being there.
    const offError = ad.addAdEventListener(AdEventType.ERROR, () => {
      loadedRef.current = false;
    });
    const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      loadedRef.current = false;
    });

    ad.load();

    return () => {
      offLoaded();
      offError();
      offClosed();
      adRef.current = null;
    };
  }, [ready]);

  const showIfAllowed = useCallback(async (midCalculation: boolean) => {
    const ad = adRef.current;
    if (!ad || !loadedRef.current) return false;

    try {
      const quota = await readQuota();
      const allowed = mayShowInterstitial({
        shownThisSession: shownThisSessionRef.current,
        midCalculation,
        quota,
        now: Date.now(),
      });
      if (!allowed) return false;

      await ad.show();
      shownThisSessionRef.current = true;
      resetSelectionTrigger();
      await recordShown();
      return true;
    } catch {
      // Never let an ad failure surface to the user.
      return false;
    }
  }, []);

  return { showIfAllowed };
}
