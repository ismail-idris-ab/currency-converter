import '@/global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CurrencyListProvider } from '@/state/currencyList';
import { CustomRatesProvider } from '@/state/customRates';
import { SettingsProvider } from '@/state/settings';

export default function RootLayout() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <CurrencyListProvider>
          <CustomRatesProvider>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: dark ? '#1C1C1E' : '#FFFFFF' },
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="currencies" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
          <Stack.Screen name="own-rates" options={{ presentation: 'modal' }} />
        </Stack>
          </CustomRatesProvider>
        </CurrencyListProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
