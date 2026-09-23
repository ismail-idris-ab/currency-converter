/**
 * Immediate-execution calculator, the behaviour people expect from a phone
 * keypad: pressing an operator resolves whatever is already pending, so
 * "2 + 3 × 4" gives 20, not 14. There is no expression parser and no eval —
 * state is just a pending left operand and one operator.
 */
export type Operator = '+' | '-' | '×' | '÷';

export interface CalcState {
  /** What the user is currently typing, always a valid decimal string. */
  readonly entry: string;
  /** Resolved left-hand operand, or null when nothing is pending. */
  readonly pending: number | null;
  readonly operator: Operator | null;
  /** True once "=" has run, so the next digit starts a fresh entry. */
  readonly settled: boolean;
}

export const INITIAL_CALC: CalcState = {
  entry: '0',
  pending: null,
  operator: null,
  settled: false,
};

/** Digits, at most one point, bounded so the display cannot be overflowed. */
const ENTRY_PATTERN = /^-?\d{0,12}(\.\d{0,8})?$/;

function toNumber(entry: string): number {
  const value = Number.parseFloat(entry);
  return Number.isFinite(value) ? value : 0;
}

/** Trims float noise (0.1 + 0.2) without truncating genuine precision. */
function normalise(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Number.parseFloat(value.toPrecision(12));
  return String(rounded);
}

function apply(left: number, operator: Operator, right: number): number | null {
  switch (operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '×':
      return left * right;
    case '÷':
      // Division by zero has no sane answer to show, so the caller keeps the
      // previous state rather than rendering Infinity or NaN.
      return right === 0 ? null : left / right;
  }
}

export function pressDigit(state: CalcState, digit: string): CalcState {
  if (!/^\d$/.test(digit)) return state;

  const base = state.settled ? INITIAL_CALC.entry : state.entry;
  const next = base === '0' ? digit : base + digit;
  if (!ENTRY_PATTERN.test(next)) return state;

  return { ...state, entry: next, settled: false };
}

export function pressDecimal(state: CalcState): CalcState {
  if (state.settled) return { ...state, entry: '0.', settled: false };
  if (state.entry.includes('.')) return state;
  return { ...state, entry: `${state.entry}.` };
}

export function backspace(state: CalcState): CalcState {
  if (state.settled) return { ...state, settled: false };
  const trimmed = state.entry.slice(0, -1);
  return { ...state, entry: trimmed === '' || trimmed === '-' ? '0' : trimmed };
}

export function clear(): CalcState {
  return INITIAL_CALC;
}

export function pressOperator(state: CalcState, operator: Operator): CalcState {
  // Replace the operator if one is already pending and nothing new was typed.
  if (state.operator !== null && state.settled) {
    return { ...state, operator, settled: false };
  }

  if (state.pending === null || state.operator === null) {
    return { entry: state.entry, pending: toNumber(state.entry), operator, settled: true };
  }

  const result = apply(state.pending, state.operator, toNumber(state.entry));
  if (result === null) return state;

  return { entry: normalise(result), pending: result, operator, settled: true };
}

export function pressEquals(state: CalcState): CalcState {
  if (state.pending === null || state.operator === null) {
    return { ...state, settled: true };
  }

  const result = apply(state.pending, state.operator, toNumber(state.entry));
  if (result === null) return state;

  return { entry: normalise(result), pending: null, operator: null, settled: true };
}

/**
 * Percent reads as "percent of the pending operand" when one exists, which is
 * what "200 + 10 %" means on a till receipt, and as a plain division by 100
 * otherwise.
 */
export function pressPercent(state: CalcState): CalcState {
  const current = toNumber(state.entry);

  if (state.pending !== null && (state.operator === '+' || state.operator === '-')) {
    return { ...state, entry: normalise((state.pending * current) / 100), settled: false };
  }

  return { ...state, entry: normalise(current / 100), settled: false };
}

/** The expression shown above the keypad, e.g. "1000 + 500". */
export function expressionOf(state: CalcState): string {
  if (state.pending === null || state.operator === null) return '';
  return `${normalise(state.pending)} ${state.operator}`;
}

/** The numeric value the converter should convert from. */
export function valueOf(state: CalcState): number {
  return toNumber(state.entry);
}
