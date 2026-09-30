import type { TFunction } from 'i18next';

import { formatBytes } from '@/domain/storage';
import type { ZoneStatus } from '@/domain/zoneState';
import { progressFraction } from '@/domain/zoneState';

export function zoneStatusText(status: ZoneStatus, t: TFunction, locale: string): string {
  const percent = Math.floor((progressFraction(status) ?? 0) * 100);
  switch (status.status) {
    case 'downloading':
      return t('zones.status.downloading', {
        percent,
        received: formatBytes(status.receivedBytes, locale),
        total: formatBytes(status.totalBytes, locale),
      });
    case 'paused':
      return t('zones.status.paused', { percent });
    case 'error':
      return t('zones.status.error', { message: t(`zones.errors.${status.code}`) });
    default:
      return t(`zones.status.${status.status}`);
  }
}
