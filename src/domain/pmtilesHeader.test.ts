import { pmtilesHeaderBytes as header } from './__fixtures__/pmtiles';
import { parsePmtilesHeader, TileType, validatePmtilesHeader } from './pmtilesHeader';

describe('parsePmtilesHeader', () => {
  it('lee zoom, bounds y offsets', () => {
    const result = parsePmtilesHeader(header());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.minZoom).toBe(0);
    expect(result.value.maxZoom).toBe(14);
    expect(result.value.bounds).toEqual([0.4, 42.5, 0.75, 42.75]);
    expect(result.value.tileDataOffset).toBe(200);
  });

  it('lee enteros de 64 bits', () => {
    const bytes = header();
    new DataView(bytes.buffer).setUint32(60, 1, true);
    const result = parsePmtilesHeader(bytes);
    expect(result.ok && result.value.tileDataOffset).toBe(2 ** 32 + 200);
  });

  it('rechaza ficheros que no son PMTiles v3', () => {
    expect(parsePmtilesHeader(new Uint8Array(10)).ok).toBe(false);
    const bad = header();
    bad[0] = 0;
    expect(parsePmtilesHeader(bad).ok).toBe(false);
    expect(parsePmtilesHeader(header({ version: 2 })).ok).toBe(false);
  });
});

describe('validatePmtilesHeader', () => {
  const parse = (bytes: Uint8Array) => {
    const r = parsePmtilesHeader(bytes);
    if (!r.ok) throw new Error(r.error);
    return r.value;
  };

  it('acepta un vectorial completo', () => {
    expect(validatePmtilesHeader(parse(header()), { kind: 'vector', fileBytes: 1000 }).ok).toBe(true);
  });
  it('detecta truncado', () => {
    expect(validatePmtilesHeader(parse(header()), { kind: 'vector', fileBytes: 999 }).ok).toBe(false);
  });
  it('detecta tipo incorrecto', () => {
    expect(validatePmtilesHeader(parse(header()), { kind: 'raster', fileBytes: 1000 }).ok).toBe(false);
    expect(
      validatePmtilesHeader(parse(header({ tileType: TileType.jpeg })), { kind: 'raster', fileBytes: 1000 })
        .ok,
    ).toBe(true);
  });
});
