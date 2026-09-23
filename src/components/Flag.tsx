import { memo } from 'react';
import { Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { FLAG_SVG } from '@/data/flags.generated';

interface FlagProps {
  readonly flagId: string;
  /** Fallback initials when no flag art exists for this id. */
  readonly code: string;
  readonly size?: number;
}

/**
 * Circular flag. Falls back to a lettered disc rather than an empty gap, so a
 * missing asset degrades to something readable instead of a hole in the row.
 */
function FlagComponent({ flagId, code, size = 40 }: FlagProps) {
  const xml = FLAG_SVG[flagId];

  if (!xml) {
    return (
      <View
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="items-center justify-center bg-brand-500">
        <Text className="text-sm font-bold text-white">{code.slice(0, 2)}</Text>
      </View>
    );
  }

  return <SvgXml xml={xml} width={size} height={size} />;
}

export const Flag = memo(FlagComponent);
