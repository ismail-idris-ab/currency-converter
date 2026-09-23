import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { Appearance } from 'react-native';

import { getDb } from '@/lib/db';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  readonly theme: ThemePreference;
  readonly autoRefresh: boolean;
  readonly grouping: boolean;
  readonly haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  autoRefresh: true,
  grouping: true,
  haptics: true,
};

const KEYS: Readonly<Record<keyof Settings, string>> = {
  theme: 'settings.theme',
  autoRefresh: 'settings.autoRefresh',
  grouping: 'settings.grouping',
  haptics: 'settings.haptics',
};

interface State {
  readonly settings: Settings;
  readonly hydrated: boolean;
}

type Action =
  | { type: 'hydrate'; settings: Settings }
  | { type: 'set'; patch: Partial<Settings> };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { settings: action.settings, hydrated: true };
    case 'set':
      return { ...state, settings: { ...state.settings, ...action.patch } };
  }
}

function isTheme(value: string): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Applies the stored preference to the whole app. React Native 0.86 spells
 * "follow the OS" as 'unspecified' rather than null.
 */
function applyTheme(theme: ThemePreference): void {
  Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
}

interface SettingsValue extends State {
  readonly update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    settings: DEFAULT_SETTINGS,
    hydrated: false,
  });

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const db = await getDb();
        const rows = await db.getAllAsync<{ key: string; value: string }>(
          'SELECT key, value FROM settings WHERE key IN (?, ?, ?, ?)',
          [KEYS.theme, KEYS.autoRefresh, KEYS.grouping, KEYS.haptics],
        );

        const stored: Record<string, string> = {};
        for (const row of rows) stored[row.key] = row.value;

        const settings: Settings = {
          theme: isTheme(stored[KEYS.theme] ?? '') 
            ? (stored[KEYS.theme] as ThemePreference)
            : DEFAULT_SETTINGS.theme,
          autoRefresh: stored[KEYS.autoRefresh] ? stored[KEYS.autoRefresh] === '1' : DEFAULT_SETTINGS.autoRefresh,
          grouping: stored[KEYS.grouping] ? stored[KEYS.grouping] === '1' : DEFAULT_SETTINGS.grouping,
          haptics: stored[KEYS.haptics] ? stored[KEYS.haptics] === '1' : DEFAULT_SETTINGS.haptics,
        };

        if (!active) return;
        applyTheme(settings.theme);
        dispatch({ type: 'hydrate', settings });
      } catch {
        // Unreadable settings fall back to defaults rather than blocking the
        // app; the next write repairs the row.
        if (active) dispatch({ type: 'hydrate', settings: DEFAULT_SETTINGS });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    if (patch.theme) applyTheme(patch.theme);
    dispatch({ type: 'set', patch });

    (async () => {
      try {
        const db = await getDb();
        for (const [key, value] of Object.entries(patch)) {
          const stored = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
          await db.runAsync(
            'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
            [KEYS[key as keyof Settings], stored],
          );
        }
      } catch {
        // Persistence is a convenience; the in-memory change still applies.
      }
    })();
  }, []);

  const value = useMemo<SettingsValue>(() => ({ ...state, update }), [state, update]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
