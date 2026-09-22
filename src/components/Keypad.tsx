import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

interface KeypadProps {
  readonly onDigit: (digit: string) => void;
  readonly onDecimal: () => void;
  readonly onBackspace: () => void;
  readonly onClear: () => void;
}

type KeyAction = 'digit' | 'decimal' | 'backspace' | 'clear';

interface KeyDef {
  readonly label: string;
  readonly action: KeyAction;
  readonly accent?: boolean;
  /** Fraction of the row this key occupies. */
  readonly span?: 1 | 2;
}

/**
 * Explicit rows rather than wrapping: the numeric block must stay a phone
 * keypad regardless of how many utility keys sit beside it.
 */
const ROWS: readonly (readonly KeyDef[])[] = [
  [
    { label: 'C', action: 'clear', accent: true },
    { label: '⌫', action: 'backspace', accent: true },
  ],
  [
    { label: '7', action: 'digit' },
    { label: '8', action: 'digit' },
    { label: '9', action: 'digit' },
  ],
  [
    { label: '4', action: 'digit' },
    { label: '5', action: 'digit' },
    { label: '6', action: 'digit' },
  ],
  [
    { label: '1', action: 'digit' },
    { label: '2', action: 'digit' },
    { label: '3', action: 'digit' },
  ],
  [
    { label: '0', action: 'digit', span: 2 },
    { label: '.', action: 'decimal' },
  ],
];

/** Digit-only keypad. Arithmetic operators arrive with the calculator slice. */
function KeypadComponent({ onDigit, onDecimal, onBackspace, onClear }: KeypadProps) {
  const handle = (key: KeyDef) => () => {
    switch (key.action) {
      case 'digit':
        onDigit(key.label);
        break;
      case 'decimal':
        onDecimal();
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
      {ROWS.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} className="flex-row">
          {row.map((key) => (
            <Pressable
              key={key.label}
              onPress={handle(key)}
              accessibilityRole="button"
              accessibilityLabel={key.label === '⌫' ? 'Backspace' : key.label}
              className={`h-16 items-center justify-center border border-neutral-200 active:opacity-60 dark:border-neutral-700 ${
                key.span === 2 ? 'flex-[2]' : 'flex-1'
              } ${key.accent ? 'bg-brand-500' : 'bg-key-light dark:bg-key-dark'}`}>
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
  );
}

export const Keypad = memo(KeypadComponent);
