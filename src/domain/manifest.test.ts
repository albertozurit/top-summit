import example from '../../docs/manifest.example.json';
import { validManifest } from './__fixtures__/manifest';
import { isAllowedDataUrl, localFileName, parseManifest, resolveFileUrl, totalZoneBytes } from './manifest';

describe('parseManifest', () => {
  it('acepta un manifest válido', () => {
    const result = parseManifest(validManifest());
    expect(result.ok).toBe(true);
  });

  it('rechaza una versión de esquema desconocida', () => {
    const result = parseManifest({ ...validManifest(), schemaVersion: 2 });
    expect(result.ok).toBe(false);
  });

  it('rechaza bbox invertido', () => {
    const m = validManifest();
    m.zones[0]!.bbox = [1, 42, 0, 43];
    expect(parseManifest(m).ok).toBe(false);
  });

  it('rechaza md5 inválido y bytes no positivos', () => {
    const m = validManifest();
    m.zones[0]!.files[0]!.md5 = 'xyz';
    expect(parseManifest(m).ok).toBe(false);
    const m2 = validManifest();
    m2.zones[0]!.files[0]!.bytes = 0;
    expect(parseManifest(m2).ok).toBe(false);
  });

  it('exige fichero vectorial y coherencia con raster', () => {
    const m = validManifest();
    m.zones[0]!.files = [m.zones[0]!.files[1]!];
    expect(parseManifest(m).ok).toBe(false);
    const m2 = validManifest();
    m2.zones[0]!.raster = 'none';
    expect(parseManifest(m2).ok).toBe(false);
  });

  it('rechaza ids duplicados y con caracteres no permitidos', () => {
    const m = validManifest();
    m.zones.push({ ...m.zones[0]! });
    expect(parseManifest(m).ok).toBe(false);
    const m2 = validManifest();
    m2.zones[0]!.id = '../etc';
    expect(parseManifest(m2).ok).toBe(false);
  });

  it('acepta el ejemplo que genera el pipeline (docs/manifest.example.json)', () => {
    const result = parseManifest(example);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.zones[0]?.files).toHaveLength(2);
  });

  it('devuelve un mensaje con la ruta del error', () => {
    const result = parseManifest({ schemaVersion: 1, generatedAt: 'x', zones: [{}] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/zones\.0/);
  });
});

describe('resolveFileUrl', () => {
  const base = 'https://github.com/u/r/releases/download/zones-1/manifest.json';
  it('resuelve rutas relativas respecto al manifest', () => {
    expect(resolveFileUrl(base, 'a.pmtiles')).toBe(
      'https://github.com/u/r/releases/download/zones-1/a.pmtiles',
    );
    expect(resolveFileUrl(base + '?x=1', './a.pmtiles')).toBe(
      'https://github.com/u/r/releases/download/zones-1/a.pmtiles',
    );
  });
  it('respeta URLs absolutas', () => {
    expect(resolveFileUrl(base, 'http://192.168.1.10:8080/a.pmtiles')).toBe(
      'http://192.168.1.10:8080/a.pmtiles',
    );
  });
});

describe('isAllowedDataUrl', () => {
  it.each([
    ['https://github.com/u/r/releases/download/z/manifest.json', true],
    ['http://192.168.1.10:8080/manifest.json', true],
    ['http://mi-pc.local/manifest.json', true],
    ['http://example.com/manifest.json', false],
    ['http://172.32.0.1/manifest.json', false],
    ['file:///etc/passwd', false],
    ['javascript:alert(1)', false],
    ['https://', false],
  ])('%s → %s', (url, allowed) => {
    expect(isAllowedDataUrl(url)).toBe(allowed);
  });

  it('el manifest rechaza ficheros por http público', () => {
    const m = validManifest();
    m.zones[0]!.files[0]!.url = 'http://example.com/a.pmtiles';
    expect(parseManifest(m).ok).toBe(false);
  });
});

describe('utilidades', () => {
  it('suma bytes y nombra ficheros locales', () => {
    const zone = validManifest().zones[0]!;
    expect(totalZoneBytes(zone)).toBe(1500);
    expect(localFileName({ kind: 'raster' })).toBe('raster.pmtiles');
  });
});
