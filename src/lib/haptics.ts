import * as Haptics from 'expo-haptics';

/**
 * Keypad feedback. Kept deliberately light — a selection tick rather than an
 * impact — because it fires on every digit. Failures are swallowed: some
 * devices have no vibrator, and a missing buzz must never break input.
 */
export function tapFeedback(enabled: boolean): void {
  if (!enabled) return;
  void Haptics.selectionAsync().catch(() => undefined);
}

/** Slightly heavier confirmation, for destructive or committing actions. */
export function confirmFeedback(enabled: boolean): void {
  if (!enabled) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
}
