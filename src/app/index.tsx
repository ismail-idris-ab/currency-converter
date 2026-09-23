import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, ToastAndroid, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/components/AdBanner';
import { CurrencyRow } from '@/components/CurrencyRow';
import { Keypad } from '@/components/Keypad';
import { OverflowMenu, type OverflowItem } from '@/components/OverflowMenu';
import { StatusBanner, type BannerTone } from '@/components/StatusBanner';
import { useConverter } from '@/hooks/useConverter';
import { useInterstitial } from '@/hooks/useInterstitial';
import { useRates } from '@/hooks/useRates';
import { resetSelectionTrigger, selectionTriggerReady } from '@/lib/ads';
import { formatAge, formatAmount, isStale } from '@/lib/format';
import { applyCustomRates, convertWithOverrides, usesCustomRate } from '@/lib/customRates';
import { useCurrencyList } from '@/state/currencyList';
import { useCustomRates } from '@/state/customRates';
import { useSettings } from '@/state/settings';

export default function ConverterScreen() {
  const router = useRouter();
  const { codes, removeCode, canRemove, canAdd } = useCurrencyList();
  const { settings } = useSettings();
  const { customRates } = useCustomRates();
  const { rates, updatedAt, status, refreshing, error, refresh } = useRates(settings.autoRefresh);

  /*
   * Own rates fold into the market table before anything converts, so a rate
   * the user set for USD-NGN also reaches GBP-NGN. Showing their naira rate
   * on one row and the official one on the next would read as a bug.
   */
  const overrides = useMemo(() => applyCustomRates(rates, customRates), [rates, customRates]);

  const {
    rows,
    activeCode,
    expression,
    setActive,
    pressDigit,
    pressDecimal,
    pressOperator,
    pressEquals,
    pressPercent,
    pasteText,
    backspace,
    clear,
  } = useConverter(overrides, codes);

  /*
   * A swallowed refresh must not look like a dead button, so the limit
   * explains itself. Failures already speak through the banner.
   */
  const onRefresh = useCallback(() => {
    refresh()
      .then((outcome) => {
        if (outcome === 'throttled') {
          ToastAndroid.show('Rates were checked a moment ago', ToastAndroid.SHORT);
        }
      })
      .catch(() => undefined);
  }, [refresh]);

  const [keypadCollapsed, setKeypadCollapsed] = useState(false);
  const toggleKeypad = useCallback(() => setKeypadCollapsed((value) => !value), []);

  const [menuOpen, setMenuOpen] = useState(false);

  const activeRow = rows.find((row) => row.isActive);

  const onCopy = useCallback(() => {
    const value = activeRow?.value ?? '';
    Clipboard.setStringAsync(value)
      .then(() => ToastAndroid.show(`Copied ${value}`, ToastAndroid.SHORT))
      .catch(() => ToastAndroid.show('Could not copy', ToastAndroid.SHORT));
  }, [activeRow]);

  const onPaste = useCallback(() => {
    Clipboard.getStringAsync()
      .then((text) => {
        // Nothing usable in the clipboard should leave the entry untouched
        // rather than silently zeroing what the user already typed.
        if (!/\d/.test(text)) {
          ToastAndroid.show('Nothing to paste', ToastAndroid.SHORT);
          return;
        }
        pasteText(text);
      })
      .catch(() => ToastAndroid.show('Could not paste', ToastAndroid.SHORT));
  }, [pasteText]);

  const menuItems = useMemo<readonly OverflowItem[]>(
    () => [
      { key: 'copy', label: 'Copy', glyph: '⧉', onPress: onCopy },
      { key: 'paste', label: 'Paste', glyph: '⎘', onPress: onPaste },
      { key: 'own', label: 'Own rates', glyph: '✎', onPress: () => router.push('/own-rates') },
      { key: 'settings', label: 'Settings', glyph: '⚙', onPress: () => router.push('/settings') },
    ],
    [onCopy, onPaste, router],
  );

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

  /*
   * One banner, in priority order: no rates at all beats no connection, and
   * both beat an age warning. Only one can be true usefully at a time, so
   * stacking them would just push the rows down for no extra information.
   */
  const banner = useMemo<{ tone: BannerTone; message: string; action?: string } | null>(() => {
    if (refreshing) return null;
    if (status === 'empty') {
      return {
        tone: 'warning',
        message: 'No saved rates yet. Connect to the internet once to download them.',
        action: 'Retry',
      };
    }
    if (error) return { tone: 'warning', message: error, action: 'Retry' };
    if (isStale(updatedAt, now)) {
      return { tone: 'info', message: `Rates last updated ${formatAge(updatedAt, now)}.`, action: 'Update' };
    }
    return null;
  }, [refreshing, status, error, updatedAt, now]);

  /*
   * The picker arms the trigger; the decision happens here because only this
   * screen knows whether a calculation is unfinished. An unfinished
   * expression keeps the trigger armed for the next quiet moment rather than
   * burning it, and anything the policy refuses disarms it so the check does
   * not run again on every selection.
   */
  const { showIfAllowed } = useInterstitial();
  const midCalculation = expression !== '';
  useEffect(() => {
    if (!selectionTriggerReady()) return;
    if (midCalculation) return;

    let active = true;
    showIfAllowed(false)
      .then((shown) => {
        if (active && !shown) resetSelectionTrigger();
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [codes, midCalculation, showIfAllowed]);

  const quoteCode = codes.find((code) => code !== activeCode) ?? activeCode;
  const unitRate = convertWithOverrides(1, activeCode, quoteCode, overrides);
  const rateIsOwn = usesCustomRate(activeCode, quoteCode, overrides);

  const openPickerFor = useCallback(
    (code: string) => {
      const slot = codes.indexOf(code);
      router.push(`/currencies?slot=${slot}`);
    },
    [codes, router],
  );

  const openPickerToAdd = useCallback(() => router.push('/currencies'), [router]);

  /*
   * A single long press can deliver more than one onLongPress: the first
   * removal re-renders the list, and the still-held gesture reaches whichever
   * row moved into that position. Observed on device removing two currencies
   * at once. The guard drops repeats, and the prompt means a destructive
   * action is never silent.
   */
  const removalPending = useRef(false);
  const confirmRemove = useCallback(
    (code: string) => {
      if (removalPending.current) return;
      removalPending.current = true;

      Alert.alert('Remove currency', `Remove ${code} from the converter?`, [
        { text: 'Cancel', style: 'cancel', onPress: () => (removalPending.current = false) },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeCode(code);
            removalPending.current = false;
          },
        },
      ]);
    },
    [removeCode],
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <View className="flex-1 bg-surface-light dark:bg-surface-dark">
        {banner ? (
          <StatusBanner
            tone={banner.tone}
            message={banner.message}
            actionLabel={banner.action}
            onAction={onRefresh}
          />
        ) : null}

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          {rows.map((row) => (
            <CurrencyRow
              key={row.code}
              code={row.code}
              value={row.value}
              isActive={row.isActive}
              canRemove={canRemove}
              grouping={settings.grouping}
              onPress={setActive}
              onOpenPicker={openPickerFor}
              onRemove={confirmRemove}
            />
          ))}

          {canAdd ? (
            <Pressable
              onPress={openPickerToAdd}
              accessibilityRole="button"
              accessibilityLabel="Add a currency"
              className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:opacity-60">
              <View className="h-10 w-10 items-center justify-center rounded-full border border-dashed border-brand-500">
                <Text className="text-xl text-brand-500 dark:text-brand-400">+</Text>
              </View>
              <Text className="text-base text-brand-500 dark:text-brand-400">Add currency</Text>
            </Pressable>
          ) : null}

        </ScrollView>

        <Keypad
          expression={expression}
          haptics={settings.haptics}
          collapsed={keypadCollapsed}
          onToggleCollapsed={toggleKeypad}
          onDigit={pressDigit}
          onDecimal={pressDecimal}
          onOperator={pressOperator}
          onEquals={pressEquals}
          onPercent={pressPercent}
          onBackspace={backspace}
          onClear={clear}
        />

        <AdBanner />

        <View className="flex-row items-center justify-between border-t border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <Pressable
            onPress={onRefresh}
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
                : `1 ${activeCode} = ${formatAmount(unitRate, quoteCode, settings.grouping)} ${quoteCode}`}
            </Text>
            {/*
              A rate the user typed must never be mistaken for the market's.
              The badge replaces the age, because "your rate" has no age that
              means anything to them. Connection and staleness live in the
              banner instead, so they stay visible on own-rate pairs too.
            */}
            <Text
              className={`text-xs ${
                rateIsOwn
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-brand-500 dark:text-brand-400'
              }`}>
              {rateIsOwn ? 'Your rate' : formatAge(updatedAt, now)}
            </Text>
          </View>

          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="More options"
            className="h-11 w-11 items-center justify-center rounded-full active:opacity-60">
            <Text className="text-xl text-brand-500 dark:text-brand-400">⋮</Text>
          </Pressable>
        </View>
        <OverflowMenu
          visible={menuOpen}
          items={menuItems}
          onDismiss={() => setMenuOpen(false)}
        />
      </View>
    </SafeAreaView>
  );
}
