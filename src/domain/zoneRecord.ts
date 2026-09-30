import { z } from 'zod';

import { localFileName, type ManifestZone } from './manifest';

/** Contenido de `Documents/zones/<id>/zone.json`: la fuente de verdad de una zona instalada. */
export const zoneRecordSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  name: z.string(),
  version: z.string(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  minZoom: z.number().int(),
  maxZoom: z.number().int(),
  osmDate: z.string(),
  demSource: z.string(),
  raster: z.enum(['hillshade', 'mtn25', 'none']),
  attribution: z.array(z.string()),
  files: z.array(
    z.object({
      kind: z.enum(['vector', 'raster']),
      fileName: z.string(),
      bytes: z.number().int().positive(),
      md5: z.string(),
    }),
  ),
  verified: z.boolean(),
  installedAt: z.string(),
});

export type ZoneRecord = z.infer<typeof zoneRecordSchema>;

export function recordFromManifestZone(zone: ManifestZone, installedAt: Date, verified: boolean): ZoneRecord {
  return {
    schemaVersion: 1,
    id: zone.id,
    name: zone.name,
    version: zone.version,
    bbox: zone.bbox,
    minZoom: zone.minZoom,
    maxZoom: zone.maxZoom,
    osmDate: zone.osmDate,
    demSource: zone.demSource,
    raster: zone.raster,
    attribution: zone.attribution,
    files: zone.files.map((f) => ({ kind: f.kind, fileName: localFileName(f), bytes: f.bytes, md5: f.md5 })),
    verified,
    installedAt: installedAt.toISOString(),
  };
}

export type DiskState = 'available' | 'broken' | 'absent';

/**
 * Decide si una zona está realmente disponible comparando su `zone.json` con lo que hay en disco.
 * `sizes` contiene el tamaño real de cada fichero de la carpeta (undefined si no existe).
 */
export function reconcileZone(
  record: ZoneRecord | undefined,
  sizes: Record<string, number | undefined>,
): DiskState {
  if (!record) return 'absent';
  if (!record.verified) return 'broken';
  const allPresent = record.files.every((f) => sizes[f.fileName] === f.bytes);
  return allPresent ? 'available' : 'broken';
}

export function isUpdateAvailable(record: ZoneRecord, zone: ManifestZone | undefined): boolean {
  return zone !== undefined && zone.version !== record.version;
}
