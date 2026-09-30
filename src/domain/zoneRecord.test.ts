import { validManifest } from './__fixtures__/manifest';
import { isUpdateAvailable, reconcileZone, recordFromManifestZone, zoneRecordSchema } from './zoneRecord';

const zone = validManifest().zones[0]!;
const record = recordFromManifestZone(zone, new Date('2026-09-30T12:00:00Z'), true);

describe('recordFromManifestZone', () => {
  it('produce un zone.json válido con nombres locales', () => {
    expect(zoneRecordSchema.safeParse(record).success).toBe(true);
    expect(record.files.map((f) => f.fileName)).toEqual(['vector.pmtiles', 'raster.pmtiles']);
    expect(record.installedAt).toBe('2026-09-30T12:00:00.000Z');
  });
});

describe('reconcileZone', () => {
  it('disponible solo si está verificada y todos los tamaños coinciden', () => {
    expect(reconcileZone(record, { 'vector.pmtiles': 1000, 'raster.pmtiles': 500 })).toBe('available');
  });
  it('rota si falta un fichero o el tamaño no coincide', () => {
    expect(reconcileZone(record, { 'vector.pmtiles': 1000 })).toBe('broken');
    expect(reconcileZone(record, { 'vector.pmtiles': 999, 'raster.pmtiles': 500 })).toBe('broken');
  });
  it('rota si no se llegó a verificar', () => {
    expect(
      reconcileZone({ ...record, verified: false }, { 'vector.pmtiles': 1000, 'raster.pmtiles': 500 }),
    ).toBe('broken');
  });
  it('ausente sin zone.json', () => {
    expect(reconcileZone(undefined, {})).toBe('absent');
  });
});

describe('isUpdateAvailable', () => {
  it('compara versiones con el manifest', () => {
    expect(isUpdateAvailable(record, zone)).toBe(false);
    expect(isUpdateAvailable(record, { ...zone, version: 'nueva' })).toBe(true);
    expect(isUpdateAvailable(record, undefined)).toBe(false);
  });
});
