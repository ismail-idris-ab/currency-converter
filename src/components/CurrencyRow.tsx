import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Flag } from '@/components/Flag';
import { getCurrency } from '@/data/currencies';
import { formatAmount } from '@/lib/format';

interface CurrencyRowProps {
  readonly code: string;
  /** Raw entry string when active, otherwise the converted numeric string. */
  readonly value: string;
  readonly isActive: boolean;
  readonly canRemove: boolean;
  readonly onPress: (code: string) => void;
  readonly onOpenPicker: (code: string) => void;
  readonly onRemove: (code: string) => void;
}

/**
 * One converter row. The active row shows the user's literal keypad entry so
 * partial input like "1." is never rewritten under them; inactive rows show a
 * formatted conversion.
 *
 * Tapping the flag/code block swaps that currency; tapping the rest of the row
 * makes it the source. Long-press removes it.
 */
function CurrencyRowComponent({
  code,
  value,
  isActive,
  canRemove,
  onPress,
  onOpenPicker,
  onRemove,
}: CurrencyRowProps) {
  const currency = getCurrency(code);
  const display = isActive
    ? value
    : value === ''
      ? '—'
      : formatAmount(Number.parseFloat(value), code);

  return (
    <Pressable
      onPress={() => onPress(code)}
      onLongPress={canRemove ? () => onRemove(code) : undefined}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${currency?.name ?? code}, ${display}`}
      accessibilityHint={canRemove ? 'Long press to remove this currency' : undefined}
      className={`min-h-[72px] flex-row items-center justify-between px-4 py-3 ${
        isActive ? 'bg-row-light dark:bg-row-dark' : 'bg-transparent'
      }`}>
      {/*
        Tapping here changes the currency; long press is deliberately NOT wired
        on this child. A nested pressable makes the gesture ambiguous — on
        device it sometimes fell through to onPress and opened the picker — so
        removal lives on the row body alone, where it behaves consistently.
      */}
      <Pressable
        onPress={() => onOpenPicker(code)}
        accessibilityRole="button"
        accessibilityLabel={`Change ${code}`}
        className="min-h-[44px] flex-row items-center gap-3 pr-2 active:opacity-60">
        <Flag flagId={currency?.flagId ?? ''} code={code} size={40} />
        <View>
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {code}
          </Text>
          <Text numberOfLines={1} className="max-w-[140px] text-xs text-neutral-500 dark:text-neutral-400">
            {currency?.name ?? 'Unknown currency'}
          </Text>
        </View>
      </Pressable>

      <Text
        numberOfLines={1}
        className={`flex-1 text-right text-2xl ${
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
