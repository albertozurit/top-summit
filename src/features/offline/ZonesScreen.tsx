import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';

import { formatBytes } from '@/domain/storage';
import { initialZoneStatus } from '@/domain/zoneState';
import { availableDiskSpace } from '@/platform/files';
import { useIsOnline } from '@/platform/network';
import { Banner } from '@/ui/Banner';
import { colors, spacing } from '@/ui/theme';

import { ZoneRow } from './ZoneRow';
import { ZonesMap } from './ZonesMap';
import { useZones, type ZoneActionError } from './ZonesProvider';

export function ZonesScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-GB' : 'es-ES';
  const zones = useZones();
  const online = useIsOnline() !== false;

  const ids = useMemo(() => {
    const remote = zones.snapshot?.manifest.zones.map((z) => z.id) ?? [];
    const local = Object.keys(zones.local).filter((id) => !remote.includes(id));
    return [...remote, ...local.sort()];
  }, [zones.snapshot, zones.local]);

  const showError = (error: ZoneActionError) => {
    const message =
      error.kind === 'no_space'
        ? t('zones.errors.no_space', { bytes: formatBytes(error.shortfallBytes, locale) })
        : t(`zones.errors.${error.kind}`);
    Alert.alert(t('zones.title'), message);
  };

  const free = formatBytes(availableDiskSpace(), locale);
  const downloading = Object.values(zones.statuses).some((s) => s.status === 'downloading');

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl onRefresh={() => void zones.refreshManifest()} refreshing={zones.refreshing} />
      }
    >
      {!zones.manifestUrl && <Banner tone="warning" text={t('zones.noManifestUrl')} />}
      {!online && <Banner tone="info" text={t('zones.offlineHint')} />}
      {online && zones.manifestError && (
        <Banner tone="warning" text={t('zones.manifestError', { message: zones.manifestError })} />
      )}
      {downloading && <Banner tone="info" text={t('zones.keepOpen')} />}
      <ZonesMap />
      <Text style={styles.meta}>
        {t('zones.freeSpace', { free })}
        {zones.snapshot
          ? ` · ${t('zones.cached', { date: new Date(zones.snapshot.fetchedAt).toLocaleString(locale) })}`
          : ''}
      </Text>
      {zones.snapshot && ids.length === 0 && <Text style={styles.meta}>{t('zones.empty')}</Text>}
      {ids.map((id) => (
        <ZoneRow
          id={id}
          key={id}
          locale={locale}
          onCancel={() => zones.cancel(id)}
          onDelete={() => zones.remove(id)}
          onDownload={() => {
            const result = zones.download(id);
            if (!result.ok) showError(result.error);
          }}
          onPause={() => zones.pause(id)}
          online={online}
          record={zones.local[id]?.record}
          remote={zones.snapshot?.manifest.zones.find((z) => z.id === id)}
          status={zones.statuses[id] ?? initialZoneStatus}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.surfaceAlt, flexGrow: 1, gap: spacing.md, padding: spacing.lg },
  meta: { color: colors.textMuted, fontSize: 13 },
});
