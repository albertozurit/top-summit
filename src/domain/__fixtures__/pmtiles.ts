import { PMTILES_HEADER_BYTES, TileType } from '../pmtilesHeader';

export function pmtilesHeaderBytes(
  opts: { tileType?: number; version?: number; tileDataOffset?: number; tileDataLength?: number } = {},
): Uint8Array {
  const bytes = new Uint8Array(PMTILES_HEADER_BYTES);
  bytes.set(
    [...'PMTiles'].map((c) => c.charCodeAt(0)),
    0,
  );
  const view = new DataView(bytes.buffer);
  view.setUint8(7, opts.version ?? 3);
  view.setUint32(8, 127, true); // root dir offset
  view.setUint32(16, 50, true); // root dir length
  view.setUint32(56, opts.tileDataOffset ?? 200, true);
  view.setUint32(64, opts.tileDataLength ?? 800, true);
  view.setUint8(99, opts.tileType ?? TileType.mvt);
  view.setUint8(100, 0);
  view.setUint8(101, 14);
  view.setInt32(102, 4_000_000, true);
  view.setInt32(106, 425_000_000, true);
  view.setInt32(110, 7_500_000, true);
  view.setInt32(114, 427_500_000, true);
  return bytes;
}
