import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { FeatureCollection } from 'geojson';
import { useMemo } from 'react';

import { buildStyle, type BuildStyleOptions, type StyleZone } from '@/domain/map/buildStyle';
import type { Lang } from '@/domain/map/zoneLayers';
import type { ZoneRecord } from '@/domain/zoneRecord';
import { zoneFile } from '@/platform/files';
import { glyphsUrlTemplate } from '@/platform/mapAssets';

import boundaries from '../../../assets/map/world/ne_110m_boundaries.json';
import land from '../../../assets/map/world/ne_110m_land.json';

const world = { land: land as FeatureCollection, boundaries: boundaries as FeatureCollection };

export function toStyleZone(record: ZoneRecord): StyleZone {
  const raster = record.files.find((f) => f.kind === 'raster');
  const vector = record.files.find((f) => f.kind === 'vector');
  return {
    id: record.id,
    vectorFileUri: zoneFile(record.id, vector?.fileName ?? 'vector.pmtiles').uri,
    ...(raster ? { rasterFileUri: zoneFile(record.id, raster.fileName).uri } : {}),
    raster: record.raster,
    bbox: record.bbox,
    attribution: record.attribution,
  };
}

/**
 * `key` cambia cuando cambian las zonas o su versión: se usa para remontar el mapa y que
 * MapLibre abra de nuevo los PMTiles tras una actualización.
 */
export function useMapStyle(
  installed: ZoneRecord[],
  lang: Lang,
  catalog?: BuildStyleOptions['catalog'],
): { style: StyleSpecification; key: string } {
  return useMemo(() => {
    const sorted = [...installed].sort((a, b) => a.id.localeCompare(b.id));
    const style = buildStyle({
      zones: sorted.map(toStyleZone),
      glyphsUrl: glyphsUrlTemplate(),
      lang,
      world,
      catalog,
    });
    const key = `${lang}|${sorted.map((z) => `${z.id}@${z.version}`).join(',')}`;
    return { style, key };
  }, [installed, lang, catalog]);
}
