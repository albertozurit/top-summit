import type {
  ExpressionSpecification,
  FilterSpecification,
  LayerSpecification,
} from '@maplibre/maplibre-gl-style-spec';

import {
  baseColors,
  pathColor,
  poiColors,
  routeCasingColor,
  routeColors,
  sacDash,
  trackColor,
} from './palette';
import { OmtLayer, POI_KINDS, SAC_GRADES, TsLayer } from './tileSchema';

export type Lang = 'es' | 'en';
export type RasterKind = 'hillshade' | 'mtn25' | 'none';

export const FONT_REGULAR = ['NotoSans-Regular'];
export const FONT_MEDIUM = ['NotoSans-Medium'];
export const FONT_ITALIC = ['NotoSans-Italic'];

export function nameExpression(lang: Lang): ExpressionSpecification {
  return lang === 'en'
    ? ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name']]
    : ['coalesce', ['get', 'name:es'], ['get', 'name']];
}

/** Grupos de capas en orden de dibujo. Con varias zonas se intercalan por grupo (ver buildStyle). */
export type LayerGroup = LayerSpecification[];

interface ZoneLayerOptions {
  zoneId: string;
  vectorSource: string;
  rasterSource?: string;
  raster: RasterKind;
  lang: Lang;
}

const routeColorExpression: ExpressionSpecification = [
  'match',
  ['get', 'ts_class'],
  'GR',
  routeColors.GR,
  'PR',
  routeColors.PR,
  'SL',
  routeColors.SL,
  routeColors.OTHER,
];

const poiColorExpression: ExpressionSpecification = [
  'match',
  ['get', 'kind'],
  ...POI_KINDS.flatMap((kind) => [kind, poiColors[kind]]),
  '#444444',
] as unknown as ExpressionSpecification;

function landcoverLayers(id: (n: string) => string, source: string): LayerGroup {
  const fill = (
    name: string,
    filter: FilterSpecification | undefined,
    color: string,
    opacity = 1,
  ): LayerSpecification => ({
    id: id(name),
    type: 'fill',
    source,
    'source-layer': name.startsWith('landuse') ? OmtLayer.landuse : OmtLayer.landcover,
    ...(filter ? { filter } : {}),
    paint: { 'fill-color': color, 'fill-opacity': opacity },
  });
  return [
    fill('landuse-residential', ['==', ['get', 'class'], 'residential'], baseColors.residential),
    fill('landcover-farmland', ['==', ['get', 'class'], 'farmland'], baseColors.farmland),
    fill('landcover-grass', ['==', ['get', 'class'], 'grass'], baseColors.grass),
    fill('landcover-wood', ['==', ['get', 'class'], 'wood'], baseColors.wood),
    fill('landcover-wetland', ['==', ['get', 'class'], 'wetland'], baseColors.wetland),
    fill('landcover-sand', ['==', ['get', 'class'], 'sand'], baseColors.sand),
    fill('landcover-rock', ['==', ['get', 'class'], 'rock'], baseColors.rock),
    fill('landcover-ice', ['==', ['get', 'class'], 'ice'], baseColors.ice),
  ];
}

function waterLayers(id: (n: string) => string, source: string): LayerGroup {
  return [
    {
      id: id('water'),
      type: 'fill',
      source,
      'source-layer': OmtLayer.water,
      paint: { 'fill-color': baseColors.water },
    },
    {
      id: id('waterway'),
      type: 'line',
      source,
      'source-layer': OmtLayer.waterway,
      minzoom: 10,
      paint: {
        'line-color': baseColors.waterway,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          0.5,
          15,
          ['match', ['get', 'class'], 'river', 3, 1.2],
        ],
      },
    },
  ];
}

function contourLayers(id: (n: string) => string, source: string): LayerGroup {
  return [
    {
      id: id('contour-minor'),
      type: 'line',
      source,
      'source-layer': TsLayer.contours,
      minzoom: 13,
      filter: ['!=', ['get', 'idx'], true],
      paint: { 'line-color': baseColors.contour, 'line-width': 0.5, 'line-opacity': 0.7 },
    },
    {
      id: id('contour-index'),
      type: 'line',
      source,
      'source-layer': TsLayer.contours,
      minzoom: 11,
      filter: ['==', ['get', 'idx'], true],
      paint: {
        'line-color': baseColors.contourIndex,
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 15, 1.2],
        'line-opacity': 0.8,
      },
    },
  ];
}

function roadLayers(id: (n: string) => string, source: string): LayerGroup {
  const roadFilter: FilterSpecification = [
    'match',
    ['get', 'class'],
    ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service'],
    true,
    false,
  ];
  const width = (extra: number): ExpressionSpecification => [
    'interpolate',
    ['linear'],
    ['zoom'],
    8,
    ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 1.2 + extra, 0.4 + extra],
    16,
    [
      'match',
      ['get', 'class'],
      ['motorway', 'trunk', 'primary'],
      8 + extra,
      ['secondary', 'tertiary'],
      6 + extra,
      3 + extra,
    ],
  ];
  return [
    {
      id: id('road-casing'),
      type: 'line',
      source,
      'source-layer': OmtLayer.transportation,
      filter: roadFilter,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': baseColors.roadCasing, 'line-width': width(1.5) },
    },
    {
      id: id('road'),
      type: 'line',
      source,
      'source-layer': OmtLayer.transportation,
      filter: roadFilter,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': [
          'match',
          ['get', 'class'],
          ['motorway', 'trunk', 'primary', 'secondary'],
          baseColors.majorRoad,
          baseColors.road,
        ],
        'line-width': width(0),
      },
    },
  ];
}

function routeBandLayers(id: (n: string) => string, source: string, opacity: number): LayerGroup {
  return [
    {
      id: id('route-casing'),
      type: 'line',
      source,
      'source-layer': TsLayer.routes,
      minzoom: 9,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': routeCasingColor,
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 3, 16, 10],
        'line-opacity': opacity,
      },
    },
    {
      id: id('route'),
      type: 'line',
      source,
      'source-layer': TsLayer.routes,
      minzoom: 9,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': routeColorExpression,
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.5, 16, 6],
        'line-opacity': opacity,
      },
    },
  ];
}

function pathLayers(id: (n: string) => string, source: string): LayerGroup {
  const width = (extra = 0): ExpressionSpecification => [
    'interpolate',
    ['linear'],
    ['zoom'],
    12,
    0.8 + extra,
    16,
    2.2 + extra,
  ];
  const layers: LayerGroup = [
    {
      id: id('track'),
      type: 'line',
      source,
      'source-layer': TsLayer.paths,
      minzoom: 12,
      filter: ['==', ['get', 'highway'], 'track'],
      paint: { 'line-color': trackColor, 'line-width': width(0.6), 'line-dasharray': [5, 2] },
    },
    {
      id: id('path-ungraded'),
      type: 'line',
      source,
      'source-layer': TsLayer.paths,
      minzoom: 12,
      filter: ['all', ['!=', ['get', 'highway'], 'track'], ['!', ['has', 'sac']]],
      paint: { 'line-color': pathColor, 'line-width': width(), 'line-dasharray': [2, 1] },
    },
  ];
  for (const grade of SAC_GRADES) {
    const dash = sacDash[grade];
    layers.push({
      id: id(`path-${grade}`),
      type: 'line',
      source,
      'source-layer': TsLayer.paths,
      minzoom: 12,
      filter: ['all', ['!=', ['get', 'highway'], 'track'], ['==', ['get', 'sac'], grade]],
      paint: {
        'line-color': pathColor,
        'line-width': width(),
        ...(dash ? { 'line-dasharray': dash } : {}),
      },
    });
  }
  return layers;
}

function labelLayers(id: (n: string) => string, source: string, lang: Lang): LayerGroup {
  const name = nameExpression(lang);
  const halo = { 'text-halo-color': baseColors.labelHalo, 'text-halo-width': 1.4 };
  return [
    {
      id: id('boundary'),
      type: 'line',
      source,
      'source-layer': OmtLayer.boundary,
      filter: ['<=', ['get', 'admin_level'], 4],
      paint: { 'line-color': baseColors.boundary, 'line-width': 1, 'line-dasharray': [3, 2] },
    },
    {
      id: id('contour-label'),
      type: 'symbol',
      source,
      'source-layer': TsLayer.contours,
      minzoom: 13,
      filter: ['==', ['get', 'idx'], true],
      layout: {
        'symbol-placement': 'line',
        'text-field': ['to-string', ['get', 'ele']],
        'text-font': FONT_REGULAR,
        'text-size': 10,
      },
      paint: { 'text-color': baseColors.contourIndex, ...halo },
    },
    {
      id: id('route-ref'),
      type: 'symbol',
      source,
      'source-layer': TsLayer.routes,
      minzoom: 12,
      filter: ['has', 'ref'],
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 300,
        'text-field': ['get', 'ref'],
        'text-font': FONT_MEDIUM,
        'text-size': 11,
      },
      paint: { 'text-color': routeColorExpression, ...halo },
    },
    {
      id: id('poi'),
      type: 'circle',
      source,
      'source-layer': TsLayer.pois,
      minzoom: 11,
      filter: ['any', ['==', ['get', 'kind'], 'peak'], ['>=', ['zoom'], 13]],
      paint: {
        'circle-color': poiColorExpression,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 5],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
      },
    },
    {
      id: id('poi-label'),
      type: 'symbol',
      source,
      'source-layer': TsLayer.pois,
      minzoom: 12,
      filter: ['any', ['==', ['get', 'kind'], 'peak'], ['>=', ['zoom'], 14]],
      layout: {
        'text-field': [
          'case',
          ['has', 'ele'],
          ['concat', name, '\n', ['to-string', ['get', 'ele']], ' m'],
          name,
        ],
        'text-font': FONT_MEDIUM,
        'text-size': ['match', ['get', 'kind'], 'peak', 12, 11],
        'text-offset': [0, 0.9],
        'text-anchor': 'top',
        'text-optional': true,
      },
      paint: { 'text-color': poiColorExpression, ...halo },
    },
    {
      id: id('place-label'),
      type: 'symbol',
      source,
      'source-layer': OmtLayer.place,
      filter: [
        'match',
        ['get', 'class'],
        ['city', 'town', 'village', 'hamlet', 'isolated_dwelling', 'locality'],
        true,
        false,
      ],
      layout: {
        'text-field': name,
        'text-font': FONT_REGULAR,
        'text-size': ['match', ['get', 'class'], ['city', 'town'], 14, 'village', 12, 10],
      },
      paint: { 'text-color': baseColors.label, ...halo },
    },
  ];
}

/**
 * Capas de una zona agrupadas por orden de dibujo.
 * - `hillshade`/`none` (opción A del spike S3): base vectorial OSM + relieve + curvas + senderos.
 * - `mtn25` (opción B): ráster oficial del IGN con los senderos OSM encima.
 */
export function zoneLayerGroups(options: ZoneLayerOptions): LayerGroup[] {
  const { zoneId, vectorSource, rasterSource, raster, lang } = options;
  const id = (name: string) => `${zoneId}:${name}`;

  const rasterLayer = (opacity: number): LayerGroup =>
    rasterSource
      ? [{ id: id('raster'), type: 'raster', source: rasterSource, paint: { 'raster-opacity': opacity } }]
      : [];

  if (raster === 'mtn25') {
    return [
      rasterLayer(1),
      routeBandLayers(id, vectorSource, 0.55),
      labelLayers(id, vectorSource, lang).filter((l) => l.id === id('route-ref')),
    ];
  }

  return [
    landcoverLayers(id, vectorSource),
    rasterLayer(0.35),
    waterLayers(id, vectorSource),
    contourLayers(id, vectorSource),
    roadLayers(id, vectorSource),
    routeBandLayers(id, vectorSource, 0.75),
    pathLayers(id, vectorSource),
    labelLayers(id, vectorSource, lang),
  ];
}
