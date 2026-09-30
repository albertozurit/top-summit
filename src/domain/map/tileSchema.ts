/**
 * Contrato entre el pipeline (`pipeline/`) y el estilo de la app. Ver docs/tile-schema.md.
 * Si cambia un nombre aquí hay que cambiarlo también en pipeline/scripts.
 */

/** Capas propias añadidas al vectorial base (OpenMapTiles vía Planetiler). */
export const TsLayer = {
  routes: 'ts_routes',
  paths: 'ts_paths',
  pois: 'ts_pois',
  contours: 'ts_contours',
} as const;

/** Capas OpenMapTiles que usa el estilo v0. */
export const OmtLayer = {
  water: 'water',
  waterway: 'waterway',
  landcover: 'landcover',
  landuse: 'landuse',
  park: 'park',
  boundary: 'boundary',
  transportation: 'transportation',
  transportationName: 'transportation_name',
  place: 'place',
  building: 'building',
} as const;

export const ROUTE_CLASSES = ['GR', 'PR', 'SL', 'OTHER'] as const;
export type RouteClass = (typeof ROUTE_CLASSES)[number];

/** Escala SAC abreviada que genera el pipeline a partir de `sac_scale` de OSM. */
export const SAC_GRADES = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'] as const;
export type SacGrade = (typeof SAC_GRADES)[number];

export const POI_KINDS = [
  'peak',
  'saddle',
  'alpine_hut',
  'wilderness_hut',
  'shelter',
  'spring',
  'drinking_water',
  'viewpoint',
  'cave_entrance',
] as const;
export type PoiKind = (typeof POI_KINDS)[number];
