import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { getCurrency } from '@/data/currencies';
import { formatAmount } from '@/lib/format';

interface CurrencyRowProps {
  readonly code: string;
  /** Raw entry string when active, otherwise the converted numeric string. */
  readonly value: string;
  readonly isActive: boolean;
  readonly onPress: (code: string) => void;
}

/**
 * One converter row. The active row shows the user's literal keypad entry so
 * partial input like "1." is never rewritten under them; inactive rows show a
 * formatted conversion.
 */
function CurrencyRowComponent({ code, value, isActive, onPress }: CurrencyRowProps) {
  const currency = getCurrency(code);
  const display = isActive
    ? value
    : value === ''
      ? '—'
      : formatAmount(Number.parseFloat(value), code);

  return (
    <Pressable
      onPress={() => onPress(code)}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${currency?.name ?? code}, ${display}`}
      className={`min-h-[72px] flex-row items-center justify-between px-5 py-3 ${
        isActive ? 'bg-row-light dark:bg-row-dark' : 'bg-transparent'
      }`}>
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-500">
          <Text className="text-sm font-bold text-white">{code.slice(0, 2)}</Text>
        </View>
        <View>
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {code}
          </Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">
            {currency?.name ?? 'Unknown currency'}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={1}
        className={`max-w-[55%] text-right text-2xl ${
          isActive
            ? 'font-bold text-brand-500 dark:text-brand-400'
            : 'font-medium text-neutral-800 dark:text-neutral-200'
        }`}>
        {display}
      </Text>
    </Pressable>
  );
}

export const CurrencyRow = memo(CurrencyRowComponent);
