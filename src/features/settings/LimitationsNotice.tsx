import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/ui/Button';
import { colors, spacing } from '@/ui/theme';

export function LimitationsText() {
  const { t } = useTranslation();
  const paragraphs = t('limitations.body', { returnObjects: true }) as readonly string[];
  return (
    <>
      {paragraphs.map((p) => (
        <Text key={p} style={styles.paragraph}>
          {p}
        </Text>
      ))}
    </>
  );
}

/** Aviso de primer arranque: hay que aceptarlo antes de ver el mapa. */
export function LimitationsNotice({ onAccept }: { onAccept: () => void }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('limitations.title')}
        </Text>
        <LimitationsText />
      </ScrollView>
      <Button label={t('limitations.accept')} onPress={onAccept} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.surface, flex: 1, padding: spacing.lg },
  content: { gap: spacing.md, paddingBottom: spacing.lg },
  title: { color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: spacing.sm },
  paragraph: { color: colors.text, fontSize: 16, lineHeight: 23 },
});
