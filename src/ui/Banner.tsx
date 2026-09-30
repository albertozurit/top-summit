import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from './theme';

export type BannerTone = 'info' | 'warning' | 'danger' | 'success';

const tones: Record<BannerTone, { bg: string; fg: string }> = {
  info: { bg: colors.info, fg: colors.text },
  warning: { bg: colors.warning, fg: colors.warningText },
  danger: { bg: colors.danger, fg: colors.dangerText },
  success: { bg: colors.success, fg: colors.successText },
};

export function Banner({ tone, text, onPress }: { tone: BannerTone; text: string; onPress?: () => void }) {
  const { bg, fg } = tones[tone];
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.banner, { backgroundColor: bg }]}
    >
      <Text style={[styles.text, { color: fg }]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  text: { fontSize: 14, fontWeight: '500' },
});
