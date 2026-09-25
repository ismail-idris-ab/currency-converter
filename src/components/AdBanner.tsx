import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { BANNER_UNIT_ID } from '@/lib/ads';

/**
 * Anchored banner above the rate bar.
 *
 * The slot keeps a reserved height while the first request is in flight so
 * the converter does not jump under the user's thumb when an ad arrives.
 *
 * A failed request is retried a few times before the slot gives up, because
 * "no fill" is an ordinary, momentary answer from the ad network rather than
 * a verdict: collapsing on the first one lost the banner for the rest of the
 * session, which was observed happening after a trip to Settings and back.
 * After the last attempt the slot collapses for good, because a permanent
 * empty strip in a utility this small is worse than no ad at all.
 */
const RETRY_DELAYS_MS = [5_000, 20_000, 60_000] as const;

function AdBannerComponent() {
  const [state, setState] = useState<'pending' | 'loaded' | 'failed'>('pending');
  /** Changing the key remounts BannerAd, which is how a new request is made. */
  const [attempt, setAttempt] = useState(0);
  /*
   * The count is held in a ref as well because scheduling belongs outside the
   * state updater: React may run an updater more than once, which would start
   * a second timer and request two banners for one failure.
   */
  const attempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const onAdFailedToLoad = useCallback(() => {
    const delay = RETRY_DELAYS_MS[attempts.current];
    if (delay === undefined) {
      setState('failed');
      return;
    }

    attempts.current += 1;
    const next = attempts.current;
    timer.current = setTimeout(() => setAttempt(next), delay);
  }, []);

  const onAdLoaded = useCallback(() => setState('loaded'), []);

  if (state === 'failed') return null;

  return (
    <View
      style={{ minHeight: 50 }}
      className="items-center justify-center bg-surface-light dark:bg-surface-dark">
      <BannerAd
        key={attempt}
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={onAdLoaded}
        onAdFailedToLoad={onAdFailedToLoad}
      />
    </View>
  );
}

export const AdBanner = memo(AdBannerComponent);
