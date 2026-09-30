import { err, ok, type Result } from './result';

/** Especificación PMTiles v3: cabecera fija de 127 bytes al inicio del fichero. */
export const PMTILES_HEADER_BYTES = 127;

export const TileType = { unknown: 0, mvt: 1, png: 2, jpeg: 3, webp: 4, avif: 5 } as const;

export interface PmtilesHeader {
  specVersion: number;
  rootDirectoryOffset: number;
  rootDirectoryLength: number;
  tileDataOffset: number;
  tileDataLength: number;
  tileType: number;
  minZoom: number;
  maxZoom: number;
  /** [oeste, sur, este, norte] en grados */
  bounds: [number, number, number, number];
}

function readUint64(view: DataView, offset: number): number {
  const low = view.getUint32(offset, true);
  const high = view.getUint32(offset + 4, true);
  return high * 2 ** 32 + low;
}

export function parsePmtilesHeader(bytes: Uint8Array): Result<PmtilesHeader> {
  if (bytes.length < PMTILES_HEADER_BYTES) return err('cabecera incompleta');
  const magic = String.fromCharCode(...bytes.subarray(0, 7));
  if (magic !== 'PMTiles') return err('no es un fichero PMTiles');
  const view = new DataView(bytes.buffer, bytes.byteOffset, PMTILES_HEADER_BYTES);
  const specVersion = view.getUint8(7);
  if (specVersion !== 3) return err(`versión PMTiles no soportada: ${specVersion}`);
  return ok({
    specVersion,
    rootDirectoryOffset: readUint64(view, 8),
    rootDirectoryLength: readUint64(view, 16),
    tileDataOffset: readUint64(view, 56),
    tileDataLength: readUint64(view, 64),
    tileType: view.getUint8(99),
    minZoom: view.getUint8(100),
    maxZoom: view.getUint8(101),
    bounds: [
      view.getInt32(102, true) / 1e7,
      view.getInt32(106, true) / 1e7,
      view.getInt32(110, true) / 1e7,
      view.getInt32(114, true) / 1e7,
    ],
  });
}

/** Comprueba que la cabecera es coherente con el tipo de fichero esperado y su tamaño real. */
export function validatePmtilesHeader(
  header: PmtilesHeader,
  expected: { kind: 'vector' | 'raster'; fileBytes: number },
): Result<true> {
  const isVector = header.tileType === TileType.mvt;
  const isRaster =
    header.tileType === TileType.png ||
    header.tileType === TileType.jpeg ||
    header.tileType === TileType.webp;
  if (expected.kind === 'vector' && !isVector) return err('se esperaba un PMTiles vectorial');
  if (expected.kind === 'raster' && !isRaster) return err('se esperaba un PMTiles ráster');
  if (header.maxZoom < header.minZoom) return err('rango de zoom inválido');
  if (header.tileDataOffset + header.tileDataLength > expected.fileBytes) return err('fichero truncado');
  if (header.rootDirectoryOffset + header.rootDirectoryLength > expected.fileBytes)
    return err('fichero truncado');
  return ok(true);
}
