import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * MapLibre carga los glyphs con una plantilla de URL `.../{fontstack}/{range}.pbf`.
 * Los .pbf viajan en el bundle como assets de Metro y se copian una vez a Documents
 * para disponer de una ruta estable `file://` que funciona sin red.
 */
const ASSETS_VERSION = '1';

/* eslint-disable @typescript-eslint/no-require-imports */
const GLYPHS: Record<string, Record<string, number>> = {
  'NotoSans-Regular': {
    '0-255': require('../../assets/map/glyphs/NotoSans-Regular/0-255.pbf'),
    '256-511': require('../../assets/map/glyphs/NotoSans-Regular/256-511.pbf'),
    '512-767': require('../../assets/map/glyphs/NotoSans-Regular/512-767.pbf'),
    '7680-7935': require('../../assets/map/glyphs/NotoSans-Regular/7680-7935.pbf'),
    '8192-8447': require('../../assets/map/glyphs/NotoSans-Regular/8192-8447.pbf'),
  },
  'NotoSans-Medium': {
    '0-255': require('../../assets/map/glyphs/NotoSans-Medium/0-255.pbf'),
    '256-511': require('../../assets/map/glyphs/NotoSans-Medium/256-511.pbf'),
    '512-767': require('../../assets/map/glyphs/NotoSans-Medium/512-767.pbf'),
    '7680-7935': require('../../assets/map/glyphs/NotoSans-Medium/7680-7935.pbf'),
    '8192-8447': require('../../assets/map/glyphs/NotoSans-Medium/8192-8447.pbf'),
  },
  'NotoSans-Italic': {
    '0-255': require('../../assets/map/glyphs/NotoSans-Italic/0-255.pbf'),
    '256-511': require('../../assets/map/glyphs/NotoSans-Italic/256-511.pbf'),
    '512-767': require('../../assets/map/glyphs/NotoSans-Italic/512-767.pbf'),
    '7680-7935': require('../../assets/map/glyphs/NotoSans-Italic/7680-7935.pbf'),
    '8192-8447': require('../../assets/map/glyphs/NotoSans-Italic/8192-8447.pbf'),
  },
};
/* eslint-enable @typescript-eslint/no-require-imports */

function mapAssetsDir(): Directory {
  return new Directory(Paths.document, 'map-assets');
}

export function glyphsUrlTemplate(): string {
  const base = new Directory(mapAssetsDir(), 'glyphs').uri.replace(/\/$/, '');
  return `${base}/{fontstack}/{range}.pbf`;
}

/** Copia los glyphs a Documents si faltan o cambió la versión. Idempotente. */
export async function installMapAssets(): Promise<void> {
  const root = mapAssetsDir();
  const marker = new File(root, 'version.txt');
  if (marker.exists && marker.textSync() === ASSETS_VERSION) return;

  if (root.exists) root.delete();
  root.create({ intermediates: true });
  const glyphsDir = new Directory(root, 'glyphs');
  glyphsDir.create();

  for (const [font, ranges] of Object.entries(GLYPHS)) {
    const fontDir = new Directory(glyphsDir, font);
    fontDir.create();
    for (const [range, moduleId] of Object.entries(ranges)) {
      const asset = Asset.fromModule(moduleId);
      await asset.downloadAsync();
      if (!asset.localUri) throw new Error(`asset de glyphs sin ruta local: ${font}/${range}`);
      await new File(asset.localUri).copy(new File(fontDir, `${range}.pbf`));
    }
  }
  marker.create();
  marker.write(ASSETS_VERSION);
}
