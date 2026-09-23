import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Flag } from '@/components/Flag';
import { CURRENCIES, type Currency } from '@/data/currencies';
import { loadUsage, recordUsage } from '@/lib/usage';
import { useCurrencyList } from '@/state/currencyList';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Search input is whitelisted to characters that can appear in a currency
 * code, name or country. Anything else is dropped before it reaches matching,
 * so a stray regex character cannot alter behaviour.
 */
function sanitizeQuery(raw: string): string {
  return raw.replace(/[^\p{L}\p{N} .'-]/gu, '').slice(0, 40);
}

function matches(currency: Currency, needle: string): boolean {
  if (needle === '') return true;
  return (
    currency.code.toLowerCase().includes(needle) ||
    currency.name.toLowerCase().includes(needle) ||
    currency.country.toLowerCase().includes(needle)
  );
}

export default function CurrenciesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slot?: string }>();
  const { codes, addCode, replaceCode } = useCurrencyList();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [usage, setUsage] = useState<Readonly<Record<string, number>>>({});

  useEffect(() => {
    const id = setTimeout(() => setDebounced(sanitizeQuery(query).trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    let active = true;
    loadUsage()
      .then((data) => {
        if (active) setUsage(data);
      })
      .catch(() => {
        // Usage data only affects ordering — an unreadable table just means
        // the list stays alphabetical.
      });
    return () => {
      active = false;
    };
  }, []);

  const data = useMemo(() => {
    const filtered = CURRENCIES.filter((c) => matches(c, debounced));
    return [...filtered].sort((a, b) => {
      const usedDiff = (usage[b.code] ?? 0) - (usage[a.code] ?? 0);
      if (usedDiff !== 0) return usedDiff;
      return a.code.localeCompare(b.code);
    });
  }, [debounced, usage]);

  const onSelect = useCallback(
    (code: string) => {
      const slot = Number.parseInt(params.slot ?? '', 10);
      if (Number.isInteger(slot) && slot >= 0) {
        replaceCode(slot, code);
      } else {
        addCode(code);
      }
      // Usage is recorded for ordering; a failure here must not block the
      // selection the user just made.
      void recordUsage(code).catch(() => undefined);
      router.back();
    },
    [params.slot, replaceCode, addCode, router],
  );

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
            Currencies
          </Text>
        </View>

        <View className="px-4 pb-2">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search code, name or country"
            placeholderTextColor="#9CA3AF"
            autoCorrect={false}
            autoCapitalize="characters"
            accessibilityLabel="Search currencies"
            className="h-12 rounded-xl bg-row-light px-4 text-base text-neutral-900 dark:bg-row-dark dark:text-neutral-100"
          />
        </View>

        <FlatList
          data={data}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={14}
          windowSize={8}
          removeClippedSubviews
          ListEmptyComponent={
            <Text className="px-5 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No currency matches that search.
            </Text>
          }
          renderItem={({ item }) => {
            const inUse = codes.includes(item.code);
            return (
              <Pressable
                onPress={() => onSelect(item.code)}
                accessibilityRole="button"
                accessibilityState={{ selected: inUse }}
                accessibilityLabel={`${item.name}, ${item.code}`}
                className="min-h-[60px] flex-row items-center gap-3 px-4 py-2 active:opacity-60">
                <Flag flagId={item.flagId} code={item.code} size={36} />
                <View className="flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-base text-neutral-900 dark:text-neutral-100">
                    {item.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="text-xs text-neutral-500 dark:text-neutral-400">
                    {item.country}
                  </Text>
                </View>
                <Text
                  className={`text-base font-semibold ${
                    inUse ? 'text-brand-500 dark:text-brand-400' : 'text-neutral-400'
                  }`}>
                  {item.code}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}
