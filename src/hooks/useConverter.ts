import { useCallback, useMemo, useState } from 'react';

import { DEFAULT_CODES } from '@/data/currencies';
import { convert } from '@/lib/rateCache';

/** Digits with at most one decimal point, max 12 significant characters. */
const ENTRY_PATTERN = /^\d{0,12}(\.\d{0,8})?$/;

export interface ConverterRow {
  readonly code: string;
  readonly value: string;
  readonly isActive: boolean;
}

export interface UseConverterResult {
  readonly rows: readonly ConverterRow[];
  readonly activeCode: string;
  readonly entry: string;
  readonly setActive: (code: string) => void;
  readonly pressDigit: (digit: string) => void;
  readonly pressDecimal: () => void;
  readonly backspace: () => void;
  readonly clear: () => void;
}

/**
 * Owns the active currency and the raw keypad entry, and derives every other
 * row from it. Entry is held as a string so trailing "." and "0" survive
 * typing — converting to a number too early makes the keypad feel broken.
 */
export function useConverter(
  rates: Readonly<Record<string, number>>,
  codes: readonly string[] = DEFAULT_CODES,
): UseConverterResult {
  const [activeCode, setActiveCode] = useState<string>(codes[0] ?? 'USD');
  const [entry, setEntry] = useState('0');

  const setActive = useCallback((code: string) => {
    setActiveCode((previous) => {
      if (previous === code) return previous;
      // Switching source keeps the on-screen number of the newly active row,
      // which is what the displayed value already showed the user.
      return code;
    });
  }, []);

  const pressDigit = useCallback((digit: string) => {
    if (!/^\d$/.test(digit)) return;
    setEntry((current) => {
      const next = current === '0' ? digit : current + digit;
      return ENTRY_PATTERN.test(next) ? next : current;
    });
  }, []);

  const pressDecimal = useCallback(() => {
    setEntry((current) => (current.includes('.') ? current : `${current}.`));
  }, []);

  const backspace = useCallback(() => {
    setEntry((current) => (current.length <= 1 ? '0' : current.slice(0, -1)));
  }, []);

  const clear = useCallback(() => setEntry('0'), []);

  const rows = useMemo<readonly ConverterRow[]>(() => {
    const amount = Number.parseFloat(entry);
    const source = Number.isFinite(amount) ? amount : 0;

    return codes.map((code) => {
      if (code === activeCode) {
        return { code, value: entry, isActive: true };
      }
      const converted = convert(source, activeCode, code, rates);
      return {
        code,
        value: converted === null ? '' : String(converted),
        isActive: false,
      };
    });
  }, [codes, activeCode, entry, rates]);

  return { rows, activeCode, entry, setActive, pressDigit, pressDecimal, backspace, clear };
}
