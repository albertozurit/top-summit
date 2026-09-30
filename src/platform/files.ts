import { Directory, File, Paths } from 'expo-file-system';

import { PMTILES_HEADER_BYTES } from '@/domain/pmtilesHeader';
import { zoneRecordSchema, type ZoneRecord } from '@/domain/zoneRecord';
import { pendingDownloadSchema, type PendingDownload } from '@/domain/downloadState';

/**
 * Las zonas viven en Documents (el sistema no las purga, a diferencia de Caches).
 * Estructura: Documents/zones/<id>/{zone.json, download.json, vector.pmtiles, raster.pmtiles}
 */
export function zonesRoot(): Directory {
  const dir = new Directory(Paths.document, 'zones');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export function zoneDir(zoneId: string): Directory {
  const dir = new Directory(zonesRoot(), zoneId);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export function zoneFile(zoneId: string, fileName: string): File {
  return new File(zoneDir(zoneId), fileName);
}

export function listZoneIds(): string[] {
  return zonesRoot()
    .list()
    .filter((entry): entry is Directory => entry instanceof Directory)
    .map((dir) => dir.name);
}

function readJsonSync(file: File): unknown {
  if (!file.exists) return undefined;
  try {
    return JSON.parse(file.textSync());
  } catch {
    return undefined;
  }
}

/** Escritura atómica: se escribe un temporal y se renombra, para no dejar JSON a medias. */
function writeJsonSync(file: File, data: unknown): void {
  const tmp = new File(file.parentDirectory, `${file.name}.tmp`);
  if (tmp.exists) tmp.delete();
  tmp.create();
  tmp.write(JSON.stringify(data));
  if (file.exists) file.delete();
  tmp.moveSync(file);
}

export function readZoneRecord(zoneId: string): ZoneRecord | undefined {
  const parsed = zoneRecordSchema.safeParse(readJsonSync(zoneFile(zoneId, 'zone.json')));
  return parsed.success ? parsed.data : undefined;
}

export function writeZoneRecord(record: ZoneRecord): void {
  writeJsonSync(zoneFile(record.id, 'zone.json'), record);
}

export function readPendingDownload(zoneId: string): PendingDownload | undefined {
  const parsed = pendingDownloadSchema.safeParse(readJsonSync(zoneFile(zoneId, 'download.json')));
  return parsed.success ? parsed.data : undefined;
}

export function writePendingDownload(pending: PendingDownload): void {
  writeJsonSync(zoneFile(pending.zoneId, 'download.json'), pending);
}

export function clearPendingDownload(zoneId: string): void {
  const file = zoneFile(zoneId, 'download.json');
  if (file.exists) file.delete();
}

/** Tamaño real de cada fichero de la carpeta de la zona. */
export function zoneFileSizes(zoneId: string): Record<string, number | undefined> {
  const sizes: Record<string, number | undefined> = {};
  for (const entry of zoneDir(zoneId).list()) {
    if (entry instanceof File) sizes[entry.name] = entry.size;
  }
  return sizes;
}

export function fileMd5(file: File): string | undefined {
  return file.info({ md5: true }).md5;
}

export function readFileHeader(file: File, length = PMTILES_HEADER_BYTES): Uint8Array {
  const handle = file.open();
  try {
    return handle.readBytes(length);
  } finally {
    handle.close();
  }
}

export function deleteZone(zoneId: string): void {
  const dir = new Directory(zonesRoot(), zoneId);
  if (dir.exists) dir.delete();
}

export function availableDiskSpace(): number {
  return Paths.availableDiskSpace;
}

/** Última copia válida del manifest, para listar zonas sin conexión. */
export function readManifestCacheFile(): unknown {
  return readJsonSync(new File(Paths.document, 'manifest-cache.json'));
}

export function writeManifestCacheFile(data: unknown): void {
  writeJsonSync(new File(Paths.document, 'manifest-cache.json'), data);
}

/** Ajustes locales sencillos (sin base de datos hasta M3). */
export function readSettingsFile(): unknown {
  return readJsonSync(new File(Paths.document, 'settings.json'));
}

export function writeSettingsFile(data: unknown): void {
  writeJsonSync(new File(Paths.document, 'settings.json'), data);
}

/** `embedded.mobileprovision` existe en builds firmadas para dispositivo, no en el simulador. */
export async function readEmbeddedProvisioning(): Promise<Uint8Array | undefined> {
  const file = new File(Paths.bundle, 'embedded.mobileprovision');
  if (!file.exists) return undefined;
  return file.bytes();
}
