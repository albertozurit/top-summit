import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from './theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  compact?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled, compact }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        styles[variant],
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant !== 'primary' && styles.labelAlt,
          variant === 'danger' && styles.labelDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.md,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  compact: { minHeight: 36, paddingHorizontal: spacing.md },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  danger: { backgroundColor: colors.surface, borderColor: colors.dangerText, borderWidth: 1 },
  dimmed: { opacity: 0.6 },
  label: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
  labelAlt: { color: colors.primary },
  labelDanger: { color: colors.dangerText },
});
