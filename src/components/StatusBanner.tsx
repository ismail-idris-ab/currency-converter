import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

export type BannerTone = 'info' | 'warning';

interface StatusBannerProps {
  readonly tone: BannerTone;
  readonly message: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}

/**
 * One line across the top of the converter for anything the user must know
 * about the rates themselves: no saved rates, no connection, or numbers old
 * enough to mislead.
 *
 * This is deliberately separate from the rate bar's small label. That label
 * has to give way to the "Your rate" badge, and a connection problem must not
 * disappear just because the user happens to be on a pair they set themselves.
 */
function StatusBannerComponent({ tone, message, actionLabel, onAction }: StatusBannerProps) {
  const surface = tone === 'warning' ? 'bg-amber-100 dark:bg-amber-950' : 'bg-brand-50 dark:bg-brand-900';
  const ink = tone === 'warning' ? 'text-amber-900 dark:text-amber-200' : 'text-brand-900 dark:text-brand-50';

  return (
    <View
      accessibilityRole="alert"
      className={`flex-row items-center gap-3 px-4 py-2 ${surface}`}>
      <Text className={`flex-1 text-xs ${ink}`}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          className="min-h-11 justify-center px-1 active:opacity-60">
          <Text className={`text-xs font-semibold uppercase ${ink}`}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const StatusBanner = memo(StatusBannerComponent);
