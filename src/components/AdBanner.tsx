import { memo, useState } from 'react';
import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { BANNER_UNIT_ID } from '@/lib/ads';

/**
 * Anchored banner above the rate bar.
 *
 * The slot keeps a reserved height while the first request is in flight so
 * the converter does not jump under the user's thumb when an ad arrives, and
 * collapses for good if there is nothing to show — a permanent empty strip in
 * a utility this small is worse than no ad at all.
 */
function AdBannerComponent() {
  const [state, setState] = useState<'pending' | 'loaded' | 'failed'>('pending');

  if (state === 'failed') return null;

  return (
    <View
      style={{ minHeight: 50 }}
      className="items-center justify-center bg-surface-light dark:bg-surface-dark">
      <BannerAd
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => setState('loaded')}
        onAdFailedToLoad={() => setState('failed')}
      />
    </View>
  );
}

export const AdBanner = memo(AdBannerComponent);
