import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Operator } from '@/lib/calculator';

interface KeypadProps {
  readonly expression: string;
  readonly collapsed: boolean;
  readonly onToggleCollapsed: () => void;
  readonly onDigit: (digit: string) => void;
  readonly onDecimal: () => void;
  readonly onOperator: (operator: Operator) => void;
  readonly onEquals: () => void;
  readonly onPercent: () => void;
  readonly onBackspace: () => void;
  readonly onClear: () => void;
}

type KeyAction =
  | { kind: 'digit'; value: string }
  | { kind: 'decimal' }
  | { kind: 'operator'; value: Operator }
  | { kind: 'equals' }
  | { kind: 'percent' }
  | { kind: 'backspace' }
  | { kind: 'clear' };

interface KeyDef {
  readonly label: string;
  readonly action: KeyAction;
  readonly accent?: boolean;
}

/**
 * Explicit rows rather than wrapping: the numeric block must stay a phone
 * keypad regardless of how many utility keys sit beside it.
 */
const ROWS: readonly (readonly KeyDef[])[] = [
  [
    { label: 'C', action: { kind: 'clear' } },
    { label: '⌫', action: { kind: 'backspace' } },
    { label: '%', action: { kind: 'percent' } },
    { label: '÷', action: { kind: 'operator', value: '÷' }, accent: true },
  ],
  [
    { label: '7', action: { kind: 'digit', value: '7' } },
    { label: '8', action: { kind: 'digit', value: '8' } },
    { label: '9', action: { kind: 'digit', value: '9' } },
    { label: '×', action: { kind: 'operator', value: '×' }, accent: true },
  ],
  [
    { label: '4', action: { kind: 'digit', value: '4' } },
    { label: '5', action: { kind: 'digit', value: '5' } },
    { label: '6', action: { kind: 'digit', value: '6' } },
    { label: '−', action: { kind: 'operator', value: '-' }, accent: true },
  ],
  [
    { label: '1', action: { kind: 'digit', value: '1' } },
    { label: '2', action: { kind: 'digit', value: '2' } },
    { label: '3', action: { kind: 'digit', value: '3' } },
    { label: '+', action: { kind: 'operator', value: '+' }, accent: true },
  ],
  [
    { label: '00', action: { kind: 'digit', value: '00' } },
    { label: '0', action: { kind: 'digit', value: '0' } },
    { label: '.', action: { kind: 'decimal' } },
    { label: '=', action: { kind: 'equals' }, accent: true },
  ],
];

function KeypadComponent({
  expression,
  collapsed,
  onToggleCollapsed,
  onDigit,
  onDecimal,
  onOperator,
  onEquals,
  onPercent,
  onBackspace,
  onClear,
}: KeypadProps) {
  const run = (action: KeyAction) => () => {
    switch (action.kind) {
      case 'digit':
        // "00" is two presses; pressDigit is a functional update so they compose.
        for (const character of action.value) onDigit(character);
        break;
      case 'decimal':
        onDecimal();
        break;
      case 'operator':
        onOperator(action.value);
        break;
      case 'equals':
        onEquals();
        break;
      case 'percent':
        onPercent();
        break;
      case 'backspace':
        onBackspace();
        break;
      case 'clear':
        onClear();
        break;
    }
  };

  return (
    <View className="border-t border-neutral-200 dark:border-neutral-700">
      <View className="h-10 flex-row items-center justify-between px-4">
        <Text
          numberOfLines={1}
          className="flex-1 text-sm text-neutral-500 dark:text-neutral-400">
          {expression}
        </Text>
        <Pressable
          onPress={onToggleCollapsed}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? 'Show keypad' : 'Hide keypad'}
          className="h-10 w-11 items-center justify-center active:opacity-60">
          <Text className="text-lg text-brand-500 dark:text-brand-400">
            {collapsed ? '⌃' : '⌄'}
          </Text>
        </Pressable>
      </View>

      {collapsed ? null : (
        <View>
          {ROWS.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} className="flex-row">
              {row.map((key) => (
                <Pressable
                  key={key.label}
                  onPress={run(key.action)}
                  accessibilityRole="button"
                  accessibilityLabel={key.label === '⌫' ? 'Backspace' : key.label}
                  className={`h-14 flex-1 items-center justify-center border border-neutral-200 active:opacity-60 dark:border-neutral-700 ${
                    key.accent ? 'bg-brand-500' : 'bg-key-light dark:bg-key-dark'
                  }`}>
                  <Text
                    className={`text-xl font-semibold ${
                      key.accent ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'
                    }`}>
                    {key.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export const Keypad = memo(KeypadComponent);
