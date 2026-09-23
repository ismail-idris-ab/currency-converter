import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clearUsage } from '@/lib/usage';
import { useSettings, type ThemePreference } from '@/state/settings';

const PRIVACY_URL = 'https://ismail-idris-ab.github.io/currency-converter/';

const THEME_OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
      {children}
    </Text>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  readonly label: string;
  readonly hint: string;
  readonly value: boolean;
  readonly onChange: (next: boolean) => void;
}) {
  return (
    <View className="min-h-14 flex-row items-center justify-between px-4 py-3">
      <View className="flex-1 pr-4">
        <Text className="text-base text-neutral-900 dark:text-neutral-100">{label}</Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: '#1F8A66', false: '#C7C7CC' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, update } = useSettings();

  const onClearUsage = useCallback(() => {
    Alert.alert(
      'Clear usage data',
      'Currencies will go back to alphabetical order. Your selected currencies are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearUsage().catch(() =>
              Alert.alert('Could not clear', 'Usage data could not be cleared. Try again.'),
            );
          },
        },
      ],
    );
  }, []);

  const onOpenPrivacy = useCallback(() => {
    Linking.openURL(PRIVACY_URL).catch(() =>
      Alert.alert('Could not open link', 'No browser is available to open the privacy policy.'),
    );
  }, []);

  const version = Constants.expoConfig?.version ?? '1.0.0';

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
            Settings
          </Text>
        </View>

        <ScrollView>
          <SectionTitle>Appearance</SectionTitle>
          <View className="flex-row gap-2 px-4">
            {THEME_OPTIONS.map((option) => {
              const selected = settings.theme === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => update({ theme: option.value })}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${option.label} theme`}
                  className={`min-h-11 flex-1 items-center justify-center rounded-xl border active:opacity-60 ${
                    selected
                      ? 'border-brand-500 bg-brand-500'
                      : 'border-neutral-300 bg-transparent dark:border-neutral-600'
                  }`}>
                  <Text
                    className={`text-sm font-medium ${
                      selected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                    }`}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <SectionTitle>Rates</SectionTitle>
          <ToggleRow
            label="Automatic refresh"
            hint="Check for new rates when the app opens"
            value={settings.autoRefresh}
            onChange={(autoRefresh) => update({ autoRefresh })}
          />

          <SectionTitle>Display</SectionTitle>
          <ToggleRow
            label="Thousand separators"
            hint="Show 1,000 instead of 1000"
            value={settings.grouping}
            onChange={(grouping) => update({ grouping })}
          />
          <ToggleRow
            label="Vibration"
            hint="Buzz when you press a key"
            value={settings.haptics}
            onChange={(haptics) => update({ haptics })}
          />

          <SectionTitle>Data</SectionTitle>
          <Pressable
            onPress={onClearUsage}
            accessibilityRole="button"
            className="min-h-14 justify-center px-4 py-3 active:opacity-60">
            <Text className="text-base text-red-600 dark:text-red-400">Clear usage data</Text>
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">
              Forget which currencies you use most
            </Text>
          </Pressable>

          <SectionTitle>About</SectionTitle>
          <View className="px-4 py-2">
            <Text className="text-sm text-neutral-700 dark:text-neutral-300">
              All Currency Converter {version}
            </Text>
            <Text className="pt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Official rates from ExchangeRate-API, with Frankfurter as a fallback. Rates are
              indicative and shown with the time they were published.
            </Text>
          </View>
          <Pressable
            onPress={onOpenPrivacy}
            accessibilityRole="link"
            className="min-h-11 justify-center px-4 py-3 active:opacity-60">
            <Text className="text-base text-brand-500 dark:text-brand-400">Privacy policy</Text>
          </Pressable>

          <View className="h-8" />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
