import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Flag } from '@/components/Flag';
import { CURRENCIES, getCurrency } from '@/data/currencies';
import { InvalidRateError, parseRateInput } from '@/lib/customRates';
import { formatAmount } from '@/lib/format';
import { useCurrencyList } from '@/state/currencyList';
import { useCustomRates } from '@/state/customRates';

function CodePicker({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly string[];
  readonly onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View className="flex-1">
      <Pressable
        onPress={() => setOpen((previous) => !previous)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        className="h-11 flex-row items-center justify-center gap-2 rounded-xl bg-row-light active:opacity-60 dark:bg-row-dark">
        <Flag flagId={getCurrency(value)?.flagId ?? ''} code={value} size={20} />
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {value}
        </Text>
      </Pressable>

      {open ? (
        <ScrollView
          className="mt-1 max-h-56 rounded-xl bg-row-light dark:bg-row-dark"
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled>
          {options.map((code) => (
            <Pressable
              key={code}
              onPress={() => {
                onChange(code);
                setOpen(false);
              }}
              accessibilityRole="button"
              className="min-h-11 flex-row items-center gap-2 px-3 py-2 active:opacity-60">
              <Flag flagId={getCurrency(code)?.flagId ?? ''} code={code} size={20} />
              <Text className="text-sm text-neutral-900 dark:text-neutral-100">{code}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

/**
 * Own rates are the user's own numbers. This screen never suggests a rate,
 * never prefills one from the market, and labels every saved entry as theirs.
 */
export default function OwnRatesScreen() {
  const router = useRouter();
  const { codes } = useCurrencyList();
  const { customRates, save, remove } = useCustomRates();

  const [base, setBase] = useState(codes[0] ?? 'USD');
  const [quote, setQuote] = useState(codes[1] ?? 'NGN');
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // The pickers offer what is on the converter first, then everything else,
  // because a rate you type is nearly always for a pair you are looking at.
  const options = useMemo(() => {
    const onScreen = codes.filter((code) => getCurrency(code));
    const rest = CURRENCIES.map((c) => c.code).filter((code) => !onScreen.includes(code));
    return [...onScreen, ...rest];
  }, [codes]);

  const onSave = useCallback(async () => {
    try {
      const rate = parseRateInput(input);
      await save(base, quote, rate);
      setInput('');
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof InvalidRateError ? cause.message : 'Could not save that rate. Try again.',
      );
    }
  }, [input, base, quote, save]);

  const onDelete = useCallback(
    (entryBase: string, entryQuote: string) => {
      Alert.alert('Reset to market rate', `Remove your own ${entryBase} to ${entryQuote} rate?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            remove(entryBase, entryQuote).catch(() =>
              Alert.alert('Could not reset', 'That rate could not be removed. Try again.'),
            );
          },
        },
      ]);
    },
    [remove],
  );

  const swap = useCallback(() => {
    setBase(quote);
    setQuote(base);
  }, [base, quote]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <View className="flex-1 bg-surface-light dark:bg-surface-dark">
        <View className="flex-row items-center gap-3 px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-11 w-11 items-center justify-center rounded-full active:opacity-60">
            <Text className="text-2xl text-brand-500 dark:text-brand-400">‹</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Own rates
          </Text>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled">
          <Text className="px-4 pb-3 text-sm text-neutral-500 dark:text-neutral-400">
            Set your own rate for a pair and the converter uses it instead of the market rate.
            Nothing here is supplied by the app.
          </Text>

          <View className="flex-row items-center gap-2 px-4">
            <CodePicker label="From" value={base} options={options} onChange={setBase} />
            <Pressable
              onPress={swap}
              accessibilityRole="button"
              accessibilityLabel="Swap currencies"
              className="h-11 w-11 items-center justify-center rounded-xl bg-row-light active:opacity-60 dark:bg-row-dark">
              <Text className="text-lg text-brand-500 dark:text-brand-400">⇄</Text>
            </Pressable>
            <CodePicker label="To" value={quote} options={options} onChange={setQuote} />
          </View>

          <View className="flex-row items-center gap-2 px-4 pt-3">
            <TextInput
              value={input}
              onChangeText={(text) => {
                setInput(text);
                if (error) setError(null);
              }}
              placeholder={`1 ${base} = ? ${quote}`}
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              accessibilityLabel={`Rate for 1 ${base} in ${quote}`}
              className="h-12 flex-1 rounded-xl bg-row-light px-4 text-base text-neutral-900 dark:bg-row-dark dark:text-neutral-100"
            />
            <Pressable
              onPress={onSave}
              accessibilityRole="button"
              accessibilityLabel="Save own rate"
              className="h-12 w-12 items-center justify-center rounded-xl bg-brand-500 active:opacity-60">
              <Text className="text-lg text-white">✓</Text>
            </Pressable>
          </View>

          {error ? (
            <Text className="px-4 pt-2 text-sm text-red-600 dark:text-red-400">{error}</Text>
          ) : null}

          <Text className="px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Your rates
          </Text>

          {customRates.length === 0 ? (
            <Text className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
              You have not set any rates yet.
            </Text>
          ) : (
            customRates.map((entry) => (
              <View
                key={`${entry.base}_${entry.quote}`}
                className="min-h-14 flex-row items-center justify-between px-4 py-3">
                <View className="flex-1 flex-row items-center gap-3 pr-3">
                  <Flag flagId={getCurrency(entry.base)?.flagId ?? ''} code={entry.base} size={28} />
                  <Flag
                    flagId={getCurrency(entry.quote)?.flagId ?? ''}
                    code={entry.quote}
                    size={28}
                  />
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-base text-neutral-900 dark:text-neutral-100">
                      1 {entry.base} = {formatAmount(entry.rate, entry.quote)} {entry.quote}
                    </Text>
                    <Text className="text-xs text-brand-500 dark:text-brand-400">Your rate</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => onDelete(entry.base, entry.quote)}
                  accessibilityRole="button"
                  accessibilityLabel={`Reset ${entry.base} to ${entry.quote} to the market rate`}
                  className="h-11 w-11 items-center justify-center rounded-full active:opacity-60">
                  <Text className="text-lg text-red-600 dark:text-red-400">×</Text>
                </Pressable>
              </View>
            ))
          )}

          <View className="h-8" />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
