import { memo } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface OverflowItem {
  readonly key: string;
  readonly label: string;
  readonly glyph: string;
  readonly onPress: () => void;
  readonly destructive?: boolean;
}

interface OverflowMenuProps {
  readonly visible: boolean;
  readonly items: readonly OverflowItem[];
  readonly onDismiss: () => void;
}

/**
 * Anchored sheet for the actions that do not deserve permanent space in the
 * rate bar. Tapping the backdrop dismisses, and hardware back is handled by
 * Modal's onRequestClose so the menu cannot trap the user.
 */
function OverflowMenuComponent({ visible, items, onDismiss }: OverflowMenuProps) {
  /*
   * The modal is statusBarTranslucent, so it draws under the system bars and
   * the last item would sit behind the navigation bar. Padding by the real
   * inset keeps every item tappable on gesture and three-button navigation
   * alike.
   */
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Close menu"
        className="flex-1 justify-end bg-black/40">
        {/* Stops a tap inside the sheet from closing it. */}
        <Pressable
          onPress={() => undefined}
          style={{ marginBottom: insets.bottom + 12 }}
          className="mx-3 overflow-hidden rounded-2xl bg-surface-light dark:bg-key-dark">
          {items.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => {
                onDismiss();
                item.onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              className="min-h-14 flex-row items-center gap-4 px-5 py-3 active:opacity-60">
              <Text className="w-6 text-center text-lg text-neutral-500 dark:text-neutral-400">
                {item.glyph}
              </Text>
              <Text
                className={`text-base ${
                  item.destructive
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-neutral-900 dark:text-neutral-100'
                }`}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const OverflowMenu = memo(OverflowMenuComponent);
