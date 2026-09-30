import { z } from 'zod';

import { err, ok, type Result } from './result';

export const MANIFEST_SCHEMA_VERSION = 1;

const PRIVATE_HOST =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[a-z0-9-]+\.local)$/i;

/**
 * https siempre; http solo hacia la red local (servidor de pruebas en el PC),
 * que es lo que permite `NSAllowsLocalNetworking` en iOS.
 */
export function isAllowedDataUrl(value: string): boolean {
  const match = /^(https?):\/\/([^\s/?#:]+)(:\d+)?([/?#]\S*)?$/i.exec(value);
  if (!match) return false;
  const [, scheme, host] = match;
  return scheme!.toLowerCase() === 'https' || PRIVATE_HOST.test(host!);
}

const bboxSchema = z
  .tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ])
  .refine(([w, s, e, n]) => w < e && s < n, { message: 'bbox debe ser [oeste, sur, este, norte]' });

export const zoneFileSchema = z.object({
  kind: z.enum(['vector', 'raster']),
  url: z
    .string()
    .min(1)
    .refine((url) => !/^[a-z][a-z0-9+.-]*:/i.test(url) || isAllowedDataUrl(url), {
      message: 'solo https (o http en red local)',
    }),
  bytes: z.number().int().positive(),
  md5: z.string().regex(/^[a-f0-9]{32}$/),
});

export const manifestZoneSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    name: z.string().min(1).max(80),
    description: z.string().max(400).optional(),
    version: z.string().min(1).max(64),
    bbox: bboxSchema,
    minZoom: z.number().int().min(0).max(22),
    maxZoom: z.number().int().min(0).max(22),
    osmDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    demSource: z.string().min(1),
    raster: z.enum(['hillshade', 'mtn25', 'none']),
    attribution: z.array(z.string().min(1)).min(1),
    files: z.array(zoneFileSchema).min(1).max(2),
  })
  .refine((zone) => zone.maxZoom >= zone.minZoom, { message: 'maxZoom < minZoom' })
  .refine((zone) => zone.files.some((f) => f.kind === 'vector'), { message: 'falta el fichero vectorial' })
  .refine((zone) => new Set(zone.files.map((f) => f.kind)).size === zone.files.length, {
    message: 'tipos de fichero repetidos',
  })
  .refine((zone) => (zone.raster === 'none') === !zone.files.some((f) => f.kind === 'raster'), {
    message: 'raster y ficheros no coinciden',
  });

export const manifestSchema = z
  .object({
    schemaVersion: z.literal(MANIFEST_SCHEMA_VERSION),
    generatedAt: z.string().min(1),
    zones: z.array(manifestZoneSchema),
  })
  .refine((m) => new Set(m.zones.map((zone) => zone.id)).size === m.zones.length, {
    message: 'ids de zona repetidos',
  });

export type Manifest = z.infer<typeof manifestSchema>;
export type ManifestZone = z.infer<typeof manifestZoneSchema>;
export type ZoneFile = z.infer<typeof zoneFileSchema>;
export type BBox = ManifestZone['bbox'];

export function parseManifest(input: unknown): Result<Manifest> {
  const parsed = manifestSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return err(first ? `${first.path.join('.') || 'manifest'}: ${first.message}` : 'manifest inválido');
  }
  return ok(parsed.data);
}

/** Resuelve la URL de un fichero relativa a la URL del manifest (p. ej. assets de la misma release). */
export function resolveFileUrl(manifestUrl: string, fileUrl: string): string {
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const base = manifestUrl.split(/[?#]/)[0] ?? manifestUrl;
  const dir = base.slice(0, base.lastIndexOf('/') + 1);
  return dir + fileUrl.replace(/^\.\//, '');
}

export function totalZoneBytes(zone: Pick<ManifestZone, 'files'>): number {
  return zone.files.reduce((sum, f) => sum + f.bytes, 0);
}

/** Nombre local de un fichero de zona: independiente de la URL de origen. */
export function localFileName(file: Pick<ZoneFile, 'kind'>): string {
  return `${file.kind}.pmtiles`;
}
