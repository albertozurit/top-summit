import { pmtilesHeaderBytes } from './__fixtures__/pmtiles';
import type { ZoneFile } from './manifest';
import { TileType } from './pmtilesHeader';
import { verifyZoneFile } from './verifyFile';

const expected: ZoneFile = { kind: 'vector', url: 'v.pmtiles', bytes: 1000, md5: 'a'.repeat(32) };
const good = { bytes: 1000, header: pmtilesHeaderBytes(), md5: 'a'.repeat(32) };

describe('verifyZoneFile', () => {
  it('acepta un fichero correcto (md5 sin distinguir mayúsculas)', () => {
    expect(verifyZoneFile(expected, good).ok).toBe(true);
    expect(verifyZoneFile(expected, { ...good, md5: 'A'.repeat(32) }).ok).toBe(true);
  });

  it.each([
    ['verify_size', { ...good, bytes: 999 }],
    ['verify_size', { ...good, bytes: undefined }],
    ['verify_header', { ...good, header: undefined }],
    ['verify_header', { ...good, header: new Uint8Array(127) }],
    ['verify_header', { ...good, header: pmtilesHeaderBytes({ tileType: TileType.png }) }],
    ['verify_md5', { ...good, md5: 'b'.repeat(32) }],
    ['verify_md5', { ...good, md5: undefined }],
  ])('devuelve %s', (code, evidence) => {
    const result = verifyZoneFile(expected, evidence);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(code);
  });
});
