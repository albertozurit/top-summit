import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { Fix } from '@/platform/location';
import { colors, radius, spacing } from '@/ui/theme';

const STALE_AFTER_S = 10;
/** Por encima de este error vertical la altitud GPS no aporta: se muestra como no fiable. */
const MAX_ALTITUDE_ACCURACY_M = 50;

export function GpsPanel({ fix, error }: { fix: Fix | null; error: string | null }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (error && !fix) return <Panel lines={[t('gps.error', { message: error })]} />;
  if (!fix) return <Panel lines={[t('gps.waiting')]} />;

  const lines: string[] = [];
  lines.push(
    fix.accuracy != null ? t('gps.accuracy', { meters: Math.round(fix.accuracy) }) : t('gps.waiting'),
  );
  if (
    fix.altitude != null &&
    fix.altitudeAccuracy != null &&
    fix.altitudeAccuracy <= MAX_ALTITUDE_ACCURACY_M
  ) {
    lines.push(
      t('gps.altitude', { meters: Math.round(fix.altitude), accuracy: Math.round(fix.altitudeAccuracy) }),
    );
  } else {
    lines.push(t('gps.altitudeUnknown'));
  }
  const ageS = Math.floor((now - fix.timestamp) / 1000);
  if (ageS >= STALE_AFTER_S) lines.push(t('gps.stale', { seconds: ageS }));
  return <Panel lines={lines} warn={ageS >= STALE_AFTER_S} />;
}

function Panel({ lines, warn }: { lines: string[]; warn?: boolean }) {
  return (
    <View accessibilityLiveRegion="polite" style={[styles.panel, warn && styles.warn]}>
      {lines.map((line) => (
        <Text key={line} style={styles.line}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  warn: { backgroundColor: colors.warning },
  line: { color: colors.text, fontSize: 14, fontVariant: ['tabular-nums'] },
});
