import { defaultSettings, effectiveManifestUrl, parseSettings } from './settings';

describe('parseSettings', () => {
  it('devuelve los valores por defecto ante datos corruptos', () => {
    expect(parseSettings(undefined)).toEqual(defaultSettings);
    expect(parseSettings({ schemaVersion: 9 })).toEqual(defaultSettings);
    expect(parseSettings({ ...defaultSettings, manifestUrl: 'http://example.com/m.json' })).toEqual(
      defaultSettings,
    );
  });

  it('conserva ajustes válidos', () => {
    const s = { schemaVersion: 1, language: 'en', limitationsAcceptedAt: '2026-09-30T00:00:00Z' };
    expect(parseSettings(s)).toEqual(s);
  });
});

describe('effectiveManifestUrl', () => {
  it('prioriza el ajuste del usuario y descarta URLs no permitidas', () => {
    const build = 'https://github.com/u/r/releases/download/z/manifest.json';
    expect(effectiveManifestUrl(defaultSettings, build)).toBe(build);
    expect(
      effectiveManifestUrl({ ...defaultSettings, manifestUrl: 'http://192.168.1.2/m.json' }, build),
    ).toBe('http://192.168.1.2/m.json');
    expect(effectiveManifestUrl(defaultSettings, 'http://example.com/m.json')).toBeUndefined();
    expect(effectiveManifestUrl(defaultSettings, undefined)).toBeUndefined();
  });
});
