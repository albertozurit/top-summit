import type { PoiKind, RouteClass, SacGrade } from './tileSchema';

/** Colores de la señalización oficial: rojo-blanco (GR), amarillo-blanco (PR), verde-blanco (SL). */
export const routeColors: Record<RouteClass, string> = {
  GR: '#d62d20',
  PR: '#f2b705',
  SL: '#2e9e3e',
  OTHER: '#7b4fb3',
};

export const routeCasingColor = '#ffffff';

/** Patrón de trazo por dificultad (unidades de ancho de línea). `null` = continuo. */
export const sacDash: Record<SacGrade, number[] | null> = {
  T1: null,
  T2: null,
  T3: [4, 2],
  T4: [3, 2],
  T5: [1, 2],
  T6: [1, 3],
};

export const pathColor = '#5b3a1e';
export const trackColor = '#8a6d3b';

export const poiColors: Record<PoiKind, string> = {
  peak: '#4a2c17',
  saddle: '#6f5a45',
  alpine_hut: '#c0392b',
  wilderness_hut: '#d35400',
  shelter: '#e67e22',
  spring: '#1f78d1',
  drinking_water: '#1aa3c9',
  viewpoint: '#8e44ad',
  cave_entrance: '#555555',
};

export const baseColors = {
  sea: '#cfe3ef',
  land: '#f3f0e8',
  water: '#a9d3ea',
  waterway: '#6fb1d9',
  wood: '#cfe2c0',
  grass: '#e4edd0',
  rock: '#dcd6cf',
  ice: '#f4fbff',
  sand: '#efe6c8',
  wetland: '#d6e8de',
  farmland: '#eeecd9',
  residential: '#e8e1dc',
  contour: '#b0845a',
  contourIndex: '#8f6337',
  road: '#ffffff',
  roadCasing: '#b9aea3',
  majorRoad: '#fbd38d',
  boundary: '#9b7fa6',
  label: '#333333',
  labelHalo: '#ffffff',
  coverage: '#5b3a1e',
  catalog: '#1f5f8b',
} as const;
