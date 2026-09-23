import { useCallback, useMemo, useState } from 'react';

import { DEFAULT_CODES } from '@/data/currencies';
import {
  INITIAL_CALC,
  backspace as calcBackspace,
  clear as calcClear,
  pressDecimal as calcDecimal,
  pressDigit as calcDigit,
  pressEquals as calcEquals,
  setEntryFromText as calcSetEntry,
  pressOperator as calcOperator,
  pressPercent as calcPercent,
  expressionOf,
  valueOf,
  type CalcState,
  type Operator,
} from '@/lib/calculator';
import { convertWithOverrides, type RateOverrides } from '@/lib/customRates';

export interface ConverterRow {
  readonly code: string;
  readonly value: string;
  readonly isActive: boolean;
}

export interface UseConverterResult {
  readonly rows: readonly ConverterRow[];
  readonly activeCode: string;
  readonly entry: string;
  /** "1000 +" while an operation is pending, empty otherwise. */
  readonly expression: string;
  readonly setActive: (code: string) => void;
  readonly pressDigit: (digit: string) => void;
  readonly pressDecimal: () => void;
  readonly pressOperator: (operator: Operator) => void;
  readonly pressEquals: () => void;
  readonly pressPercent: () => void;
  readonly pasteText: (text: string) => void;
  readonly backspace: () => void;
  readonly clear: () => void;
}

/**
 * Owns the active currency and the calculator state, and derives every other
 * row from it. The entry stays a string so trailing "." and "0" survive
 * typing — converting to a number too early makes the keypad feel broken.
 */
export function useConverter(
  overrides: RateOverrides,
  codes: readonly string[] = DEFAULT_CODES,
): UseConverterResult {
  const [activeCode, setActiveCode] = useState<string>(codes[0] ?? 'USD');
  const [calc, setCalc] = useState<CalcState>(INITIAL_CALC);

  /*
   * The active currency can be removed or swapped out from the picker, which
   * would otherwise leave this pointing at a row that no longer exists and
   * blank every conversion. Falling back to the first row keeps the screen
   * usable without an extra effect to resynchronise state.
   */
  const effectiveActive = codes.includes(activeCode) ? activeCode : (codes[0] ?? activeCode);

  const setActive = useCallback((code: string) => setActiveCode(code), []);

  const pressDigit = useCallback((digit: string) => setCalc((c) => calcDigit(c, digit)), []);
  const pressDecimal = useCallback(() => setCalc(calcDecimal), []);
  const pressOperator = useCallback(
    (operator: Operator) => setCalc((c) => calcOperator(c, operator)),
    [],
  );
  const pressEquals = useCallback(() => setCalc(calcEquals), []);
  const pressPercent = useCallback(() => setCalc(calcPercent), []);
  const pasteText = useCallback((text: string) => setCalc((c) => calcSetEntry(c, text)), []);
  const backspace = useCallback(() => setCalc(calcBackspace), []);
  const clear = useCallback(() => setCalc(calcClear), []);

  const rows = useMemo<readonly ConverterRow[]>(() => {
    const source = valueOf(calc);

    return codes.map((code) => {
      if (code === effectiveActive) {
        return { code, value: calc.entry, isActive: true };
      }
      const converted = convertWithOverrides(source, effectiveActive, code, overrides);
      return {
        code,
        value: converted === null ? '' : String(converted),
        isActive: false,
      };
    });
  }, [codes, effectiveActive, calc, overrides]);

  return {
    rows,
    activeCode: effectiveActive,
    entry: calc.entry,
    expression: expressionOf(calc),
    setActive,
    pressDigit,
    pressDecimal,
    pressOperator,
    pressEquals,
    pressPercent,
    pasteText,
    backspace,
    clear,
  };
}
