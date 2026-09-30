import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { baseColors, pathColor, poiColors, routeColors, trackColor } from '@/domain/map/palette';
import { POI_KINDS } from '@/domain/map/tileSchema';
import { Section } from '@/ui/Section';
import { colors, spacing } from '@/ui/theme';

/** Muestra de línea hecha con Views: basta para indicar color y tipo de trazo. */
function LineSwatch({ color, dash, width = 4 }: { color: string; dash?: boolean; width?: number }) {
  if (!dash) return <View style={[styles.line, { backgroundColor: color, height: width }]} />;
  return (
    <View style={styles.dashRow}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.dash, { backgroundColor: color, height: width }]} />
      ))}
    </View>
  );
}

function Row({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.swatch}>{swatch}</View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function LegendScreen() {
  const { t } = useTranslation();
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Section title={t('legend.routes')}>
        <Row label={t('legend.gr')} swatch={<LineSwatch color={routeColors.GR} width={6} />} />
        <Row label={t('legend.pr')} swatch={<LineSwatch color={routeColors.PR} width={6} />} />
        <Row label={t('legend.sl')} swatch={<LineSwatch color={routeColors.SL} width={6} />} />
        <Row label={t('legend.other')} swatch={<LineSwatch color={routeColors.OTHER} width={6} />} />
      </Section>
      <Section title={t('legend.paths')}>
        <Row label={t('legend.sacT1T2')} swatch={<LineSwatch color={pathColor} width={2} />} />
        <Row label={t('legend.sacT3')} swatch={<LineSwatch color={pathColor} dash width={2} />} />
        <Row label={t('legend.sacT4')} swatch={<LineSwatch color={pathColor} dash width={2} />} />
        <Row label={t('legend.sacT5T6')} swatch={<LineSwatch color={pathColor} dash width={1.5} />} />
        <Row label={t('legend.track')} swatch={<LineSwatch color={trackColor} width={3} />} />
      </Section>
      <Section title={t('legend.pois')}>
        {POI_KINDS.map((kind) => (
          <Row
            key={kind}
            label={t(`feature.${kind}`)}
            swatch={<View style={[styles.dot, { backgroundColor: poiColors[kind] }]} />}
          />
        ))}
      </Section>
      <Section title={t('legend.contours')}>
        <Row
          label={t('legend.contourInfo')}
          swatch={<LineSwatch color={baseColors.contourIndex} width={1.5} />}
        />
      </Section>
      <Text style={styles.note}>{t('legend.note')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.surfaceAlt, padding: spacing.lg },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 28 },
  swatch: { alignItems: 'center', width: 48 },
  line: { borderRadius: 2, width: 44 },
  dashRow: { flexDirection: 'row', gap: 4, width: 44 },
  dash: { borderRadius: 1, flex: 1 },
  dot: { borderColor: '#fff', borderRadius: 7, borderWidth: 2, height: 14, width: 14 },
  label: { color: colors.text, flex: 1, fontSize: 15 },
  note: { color: colors.textMuted, fontSize: 13 },
});
