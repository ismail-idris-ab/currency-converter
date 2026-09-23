import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import { DEFAULT_CODES, getCurrency } from '@/data/currencies';
import { getDb } from '@/lib/db';

const STORAGE_KEY = 'converter.codes';
/** Two rows is the floor: one currency alone cannot express a conversion. */
const MIN_CODES = 2;
const MAX_CODES = 10;

interface State {
  readonly codes: readonly string[];
  readonly hydrated: boolean;
}

type Action =
  | { type: 'hydrate'; codes: readonly string[] }
  | { type: 'add'; code: string }
  | { type: 'replace'; index: number; code: string }
  | { type: 'remove'; code: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { codes: action.codes, hydrated: true };

    case 'add':
      if (state.codes.includes(action.code) || state.codes.length >= MAX_CODES) return state;
      return { ...state, codes: [...state.codes, action.code] };

    case 'replace': {
      const { index, code } = action;
      if (index < 0 || index >= state.codes.length) return state;
      if (state.codes[index] === code) return state;

      const existing = state.codes.indexOf(code);
      const next = [...state.codes];
      if (existing !== -1) {
        // Picking a currency already on screen swaps the two rows rather than
        // creating a duplicate the converter cannot disambiguate.
        next[existing] = next[index];
      }
      next[index] = code;
      return { ...state, codes: next };
    }

    case 'remove':
      if (state.codes.length <= MIN_CODES) return state;
      return { ...state, codes: state.codes.filter((c) => c !== action.code) };
  }
}

/** Keeps only codes this build actually knows about, preserving order. */
function sanitize(codes: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const code of codes) {
    if (seen.has(code) || !getCurrency(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out.length >= MIN_CODES ? out.slice(0, MAX_CODES) : DEFAULT_CODES;
}

interface CurrencyListValue extends State {
  readonly addCode: (code: string) => void;
  readonly replaceCode: (index: number, code: string) => void;
  readonly removeCode: (code: string) => void;
  readonly canRemove: boolean;
  readonly canAdd: boolean;
}

const CurrencyListContext = createContext<CurrencyListValue | null>(null);

export function CurrencyListProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { codes: DEFAULT_CODES, hydrated: false });

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const db = await getDb();
        const row = await db.getFirstAsync<{ value: string }>(
          'SELECT value FROM settings WHERE key = ?',
          [STORAGE_KEY],
        );
        const parsed: unknown = row ? JSON.parse(row.value) : null;
        const codes = Array.isArray(parsed) ? sanitize(parsed.filter((c) => typeof c === 'string')) : DEFAULT_CODES;
        if (active) dispatch({ type: 'hydrate', codes });
      } catch {
        // A corrupt or unreadable row must not block the app: fall back to
        // defaults and let the next write repair it.
        if (active) dispatch({ type: 'hydrate', codes: DEFAULT_CODES });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;

    (async () => {
      try {
        const db = await getDb();
        await db.runAsync(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
          [STORAGE_KEY, JSON.stringify(state.codes)],
        );
      } catch {
        // Persistence is a convenience; losing it must not break conversion.
      }
    })();
  }, [state.codes, state.hydrated]);

  const addCode = useCallback((code: string) => dispatch({ type: 'add', code }), []);
  const replaceCode = useCallback(
    (index: number, code: string) => dispatch({ type: 'replace', index, code }),
    [],
  );
  const removeCode = useCallback((code: string) => dispatch({ type: 'remove', code }), []);

  const value = useMemo<CurrencyListValue>(
    () => ({
      ...state,
      addCode,
      replaceCode,
      removeCode,
      canRemove: state.codes.length > MIN_CODES,
      canAdd: state.codes.length < MAX_CODES,
    }),
    [state, addCode, replaceCode, removeCode],
  );

  return <CurrencyListContext.Provider value={value}>{children}</CurrencyListContext.Provider>;
}

export function useCurrencyList(): CurrencyListValue {
  const value = useContext(CurrencyListContext);
  if (!value) throw new Error('useCurrencyList must be used inside CurrencyListProvider');
  return value;
}
