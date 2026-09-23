import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CurrencyRow } from '@/components/CurrencyRow';
import { Keypad } from '@/components/Keypad';
import { DEFAULT_CODES } from '@/data/currencies';
import { useConverter } from '@/hooks/useConverter';
import { useRates } from '@/hooks/useRates';
import { formatAge, formatAmount } from '@/lib/format';
import { convert } from '@/lib/rateCache';

export default function ConverterScreen() {
  const { rates, updatedAt, status, refreshing, error, refresh } = useRates();
  const { rows, activeCode, setActive, pressDigit, pressDecimal, backspace, clear } =
    useConverter(rates, DEFAULT_CODES);

  /*
   * The "updated X ago" label is derived at render time, so without a tick it
   * would sit at whatever it said when the screen last re-rendered. Thirty
   * seconds is fine enough for a minute-resolution label.
   */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const quoteCode = DEFAULT_CODES.find((code) => code !== activeCode) ?? activeCode;
  const unitRate = convert(1, activeCode, quoteCode, rates);

  /*
   * SafeAreaView comes from react-native-safe-area-context, which NativeWind
   * does not style from className without cssInterop registration — so its
   * flex is set through the style prop and the themed background lives on an
   * inner View. Without this the rows collapse to zero height.
   */
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <View className="flex-1 bg-surface-light dark:bg-surface-dark">
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          {rows.map((row) => (
            <CurrencyRow
              key={row.code}
              code={row.code}
              value={row.value}
              isActive={row.isActive}
              onPress={setActive}
            />
          ))}

          {status === 'empty' && !refreshing ? (
            <Text className="px-5 py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No saved rates yet. Connect to the internet once to download them.
            </Text>
          ) : null}
        </ScrollView>

        <Keypad
          onDigit={pressDigit}
          onDecimal={pressDecimal}
          onBackspace={backspace}
          onClear={clear}
        />

        <View className="flex-row items-center justify-between border-t border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <Pressable
            onPress={refresh}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh rates"
            className="h-11 w-11 items-center justify-center rounded-full active:opacity-60">
            {refreshing ? (
              <ActivityIndicator size="small" color="#1F8A66" />
            ) : (
              <Text className="text-xl text-brand-500 dark:text-brand-400">⟳</Text>
            )}
          </Pressable>

          <View className="flex-1 items-center">
            <Text className="text-sm text-neutral-700 dark:text-neutral-300">
              {unitRate === null
                ? 'Rate unavailable'
                : `1 ${activeCode} = ${formatAmount(unitRate, quoteCode)} ${quoteCode}`}
            </Text>
            <Text
              className={`text-xs ${
                error ? 'text-amber-600 dark:text-amber-400' : 'text-brand-500 dark:text-brand-400'
              }`}>
              {error ?? formatAge(updatedAt, now)}
            </Text>
          </View>

          <View className="h-11 w-11" />
        </View>
      </View>
    </SafeAreaView>
  );
}
