import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { totalZoneBytes, type ManifestZone } from '@/domain/manifest';
import { formatBytes } from '@/domain/storage';
import { isUpdateAvailable, type ZoneRecord } from '@/domain/zoneRecord';
import { progressFraction, type ZoneStatus } from '@/domain/zoneState';
import { Button } from '@/ui/Button';
import { colors, radius, spacing } from '@/ui/theme';

import { zoneStatusText } from './statusText';

export interface ZoneRowProps {
  id: string;
  remote: ManifestZone | undefined;
  record: ZoneRecord | undefined;
  status: ZoneStatus;
  online: boolean;
  locale: string;
  onDownload(): void;
  onPause(): void;
  onCancel(): void;
  onDelete(): void;
}

export function ZoneRow({
  id,
  remote,
  record,
  status,
  online,
  locale,
  onDownload,
  onPause,
  onCancel,
  onDelete,
}: ZoneRowProps) {
  const { t } = useTranslation();
  const name = remote?.name ?? record?.name ?? id;
  const bytes = remote ? totalZoneBytes(remote) : record?.files.reduce((sum, f) => sum + f.bytes, 0);
  const osmDate = remote?.osmDate ?? record?.osmDate;
  const fraction = progressFraction(status);
  const canDownload = online && remote !== undefined;

  const confirm = (message: string, onConfirm: () => void) =>
    Alert.alert(name, message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.ok'), style: 'destructive', onPress: onConfirm },
    ]);

  return (
    <View style={styles.row}>
      <Text style={styles.name}>{name}</Text>
      {remote?.description ? <Text style={styles.meta}>{remote.description}</Text> : null}
      <Text style={styles.meta}>
        {bytes !== undefined ? t('zones.size', { size: formatBytes(bytes, locale) }) : ''}
        {osmDate ? ` · ${t('zones.dataDate', { date: osmDate })}` : ''}
      </Text>
      <Text
        style={[
          styles.status,
          status.status === 'available' && styles.available,
          status.status === 'error' && styles.error,
        ]}
      >
        {zoneStatusText(status, t, locale)}
      </Text>
      {fraction !== null && (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]} />
        </View>
      )}
      <View style={styles.actions}>
        {status.status === 'not_installed' && (
          <Button compact disabled={!canDownload} label={t('zones.download')} onPress={onDownload} />
        )}
        {status.status === 'downloading' && (
          <>
            <Button compact label={t('zones.pause')} onPress={onPause} variant="secondary" />
            <Button
              compact
              label={t('common.cancel')}
              onPress={() => confirm(t('zones.confirmCancel'), onCancel)}
              variant="danger"
            />
          </>
        )}
        {status.status === 'paused' && (
          <>
            <Button compact disabled={!canDownload} label={t('zones.resume')} onPress={onDownload} />
            <Button
              compact
              label={t('common.cancel')}
              onPress={() => confirm(t('zones.confirmCancel'), onCancel)}
              variant="danger"
            />
          </>
        )}
        {status.status === 'available' && (
          <>
            {record && isUpdateAvailable(record, remote) && (
              <Button compact disabled={!canDownload} label={t('zones.update')} onPress={onDownload} />
            )}
            <Button
              compact
              label={t('zones.delete')}
              onPress={() => confirm(t('zones.confirmDelete', { name }), onDelete)}
              variant="danger"
            />
          </>
        )}
        {status.status === 'error' && (
          <>
            <Button compact disabled={!canDownload} label={t('common.retry')} onPress={onDownload} />
            <Button
              compact
              label={t('zones.delete')}
              onPress={() => confirm(t('zones.confirmDelete', { name }), record ? onDelete : onCancel)}
              variant="danger"
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.surface, borderRadius: radius.md, gap: spacing.xs, padding: spacing.md },
  name: { color: colors.text, fontSize: 17, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 13 },
  status: { color: colors.text, fontSize: 14, marginTop: spacing.xs },
  available: { color: colors.successText, fontWeight: '600' },
  error: { color: colors.dangerText },
  track: { backgroundColor: colors.surfaceAlt, borderRadius: 3, height: 6, overflow: 'hidden' },
  fill: { backgroundColor: colors.primary, height: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
});
