import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  deleteCustomRate,
  loadCustomRates,
  saveCustomRate,
  type CustomRate,
} from '@/lib/customRates';

interface CustomRatesValue {
  readonly customRates: readonly CustomRate[];
  readonly hydrated: boolean;
  readonly save: (base: string, quote: string, rate: number) => Promise<void>;
  readonly remove: (base: string, quote: string) => Promise<void>;
  readonly reload: () => Promise<void>;
}

const CustomRatesContext = createContext<CustomRatesValue | null>(null);

export function CustomRatesProvider({ children }: { children: ReactNode }) {
  const [customRates, setCustomRates] = useState<readonly CustomRate[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const reload = useCallback(async () => {
    try {
      setCustomRates(await loadCustomRates());
    } catch {
      // An unreadable table means no overrides, which is the safe direction:
      // the app falls back to market rates rather than refusing to convert.
      setCustomRates([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Hydrates once. The work is awaited before any setState, and the flag stops
  // a slow read from writing into an unmounted provider.
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const stored = await loadCustomRates();
        if (active) setCustomRates(stored);
      } catch {
        // An unreadable table means no overrides, which is the safe direction:
        // the app falls back to market rates rather than refusing to convert.
        if (active) setCustomRates([]);
      } finally {
        if (active) setHydrated(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(
    async (base: string, quote: string, rate: number) => {
      await saveCustomRate(base, quote, rate);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (base: string, quote: string) => {
      await deleteCustomRate(base, quote);
      await reload();
    },
    [reload],
  );

  const value = useMemo<CustomRatesValue>(
    () => ({ customRates, hydrated, save, remove, reload }),
    [customRates, hydrated, save, remove, reload],
  );

  return <CustomRatesContext.Provider value={value}>{children}</CustomRatesContext.Provider>;
}

export function useCustomRates(): CustomRatesValue {
  const value = useContext(CustomRatesContext);
  if (!value) throw new Error('useCustomRates must be used inside CustomRatesProvider');
  return value;
}
