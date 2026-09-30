import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { FeatureInfo } from '@/domain/map/featureInfo';
import { Button } from '@/ui/Button';
import { colors, radius, spacing } from '@/ui/theme';

function summarize(info: FeatureInfo, t: TFunction): { title: string; details: (string | undefined)[] } {
  switch (info.category) {
    case 'poi':
      return {
        title: info.name ?? t('feature.unnamed'),
        details: [
          info.kind ? t(`feature.${info.kind}`) : undefined,
          info.ele != null ? t('feature.elevation', { meters: info.ele }) : undefined,
        ],
      };
    case 'route':
      return {
        title: [info.ref, info.name].filter(Boolean).join(' · ') || t('feature.unnamed'),
        details: [`${t('feature.route')} ${info.routeClass === 'OTHER' ? '' : info.routeClass}`.trim()],
      };
    case 'path':
      return {
        title: info.name ?? t(info.highway === 'track' ? 'feature.track' : 'feature.path'),
        details: [info.sac ? t('feature.sac', { grade: info.sac }) : undefined],
      };
    case 'contour':
      return {
        title: t('feature.contour'),
        details: [info.ele != null ? t('feature.elevation', { meters: info.ele }) : undefined],
      };
  }
}

export function FeatureCard({ info, onClose }: { info: FeatureInfo; onClose: () => void }) {
  const { t } = useTranslation();
  const { title, details } = summarize(info, t);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {details.filter(Boolean).map((line) => (
        <Text key={line} style={styles.detail}>
          {line}
        </Text>
      ))}
      <Text style={styles.disclaimer}>{t('feature.osmDisclaimer')}</Text>
      <Button compact label={t('common.close')} onPress={onClose} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.xs, padding: spacing.lg },
  title: { color: colors.text, fontSize: 17, fontWeight: '600' },
  detail: { color: colors.text, fontSize: 15 },
  disclaimer: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm, marginTop: spacing.xs },
});
