import type {
  LayerSpecification,
  SourceSpecification,
  StyleSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import type { FeatureCollection } from 'geojson';

import type { BBox } from '../manifest';
import { baseColors } from './palette';
import { FONT_MEDIUM, zoneLayerGroups, type Lang, type RasterKind } from './zoneLayers';

export interface StyleZone {
  id: string;
  /** URI local (`file://...`) del PMTiles vectorial. */
  vectorFileUri: string;
  rasterFileUri?: string;
  raster: RasterKind;
  bbox: BBox;
  attribution: string[];
}

export interface BuildStyleOptions {
  zones: StyleZone[];
  /** Plantilla MapLibre: `file:///.../glyphs/{fontstack}/{range}.pbf` */
  glyphsUrl: string;
  lang: Lang;
  world: { land: FeatureCollection; boundaries: FeatureCollection };
  /** Zonas del catálogo aún no instaladas: se dibujan como polígonos para elegir qué descargar. */
  catalog?: { id: string; name: string; bbox: BBox }[];
}

export const WORLD_ATTRIBUTION = 'Made with Natural Earth';

export function pmtilesUrl(fileUri: string): string {
  return `pmtiles://${fileUri}`;
}

export function bboxPolygon([w, s, e, n]: BBox): GeoJSON.Polygon {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [w, s],
        [e, s],
        [e, n],
        [w, n],
        [w, s],
      ],
    ],
  };
}

/**
 * Genera el estilo completo a partir de las zonas instaladas. Solo usa recursos locales:
 * el mapa nunca hace peticiones de red.
 */
export function buildStyle({
  zones,
  glyphsUrl,
  lang,
  world,
  catalog = [],
}: BuildStyleOptions): StyleSpecification {
  const sources: Record<string, SourceSpecification> = {
    'world-land': { type: 'geojson', data: world.land, attribution: WORLD_ATTRIBUTION },
    'world-boundaries': { type: 'geojson', data: world.boundaries },
    coverage: {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: zones.map((zone) => ({
          type: 'Feature',
          properties: { id: zone.id },
          geometry: bboxPolygon(zone.bbox),
        })),
      },
    },
    catalog: {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: catalog.map((zone) => ({
          type: 'Feature',
          properties: { id: zone.id, name: zone.name },
          geometry: bboxPolygon(zone.bbox),
        })),
      },
    },
  };

  const perZoneGroups = zones.map((zone) => {
    const vectorSource = `${zone.id}:vector`;
    const rasterSource = zone.rasterFileUri ? `${zone.id}:raster` : undefined;
    const attribution = zone.attribution.join(' · ');
    sources[vectorSource] = { type: 'vector', url: pmtilesUrl(zone.vectorFileUri), attribution };
    if (rasterSource && zone.rasterFileUri) {
      sources[rasterSource] = { type: 'raster', url: pmtilesUrl(zone.rasterFileUri), tileSize: 256 };
    }
    return zoneLayerGroups({ zoneId: zone.id, vectorSource, rasterSource, raster: zone.raster, lang });
  });

  const groupCount = Math.max(0, ...perZoneGroups.map((groups) => groups.length));
  const zoneLayers: LayerSpecification[] = [];
  for (let g = 0; g < groupCount; g += 1) {
    for (const groups of perZoneGroups) zoneLayers.push(...(groups[g] ?? []));
  }

  return {
    version: 8,
    name: 'Top Summit Outdoor v0',
    glyphs: glyphsUrl,
    sources,
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': baseColors.sea } },
      { id: 'world-land', type: 'fill', source: 'world-land', paint: { 'fill-color': baseColors.land } },
      {
        id: 'world-boundaries',
        type: 'line',
        source: 'world-boundaries',
        maxzoom: 9,
        paint: { 'line-color': baseColors.boundary, 'line-width': 0.8 },
      },
      ...zoneLayers,
      {
        id: 'coverage-outline',
        type: 'line',
        source: 'coverage',
        paint: {
          'line-color': baseColors.coverage,
          'line-width': 1.5,
          'line-dasharray': [4, 3],
          'line-opacity': 0.5,
        },
      },
      {
        id: 'catalog-fill',
        type: 'fill',
        source: 'catalog',
        paint: { 'fill-color': baseColors.catalog, 'fill-opacity': 0.12 },
      },
      {
        id: 'catalog-outline',
        type: 'line',
        source: 'catalog',
        paint: { 'line-color': baseColors.catalog, 'line-width': 2 },
      },
      {
        id: 'catalog-label',
        type: 'symbol',
        source: 'catalog',
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT_MEDIUM, 'text-size': 13 },
        paint: {
          'text-color': baseColors.catalog,
          'text-halo-color': baseColors.labelHalo,
          'text-halo-width': 1.4,
        },
      },
    ],
  };
}

export function zonesContaining(zones: Pick<StyleZone, 'id' | 'bbox'>[], lon: number, lat: number): string[] {
  return zones
    .filter(({ bbox: [w, s, e, n] }) => lon >= w && lon <= e && lat >= s && lat <= n)
    .map((zone) => zone.id);
}
