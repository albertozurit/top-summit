import type { PendingDownload } from '@/domain/downloadState';
import { reconcileZone, type DiskState, type ZoneRecord } from '@/domain/zoneRecord';
import { listZoneIds, readPendingDownload, readZoneRecord, zoneFileSizes } from '@/platform/files';
import { logger } from '@/lib/logger';

export interface LocalZone {
  id: string;
  record: ZoneRecord | undefined;
  disk: DiskState;
  pending: PendingDownload | undefined;
}

/** Reconstruye el estado de las zonas desde disco; `zone.json` + tamaños reales son la fuente de verdad. */
export function scanLocalZones(): Record<string, LocalZone> {
  const zones: Record<string, LocalZone> = {};
  for (const id of listZoneIds()) {
    try {
      const record = readZoneRecord(id);
      zones[id] = {
        id,
        record,
        disk: reconcileZone(record, zoneFileSizes(id)),
        pending: readPendingDownload(id),
      };
    } catch (e) {
      logger.warn('zones', `no se pudo leer la zona ${id}`, e);
    }
  }
  return zones;
}
