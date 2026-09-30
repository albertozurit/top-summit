import {
  POI_KINDS,
  ROUTE_CLASSES,
  SAC_GRADES,
  type PoiKind,
  type RouteClass,
  type SacGrade,
} from './tileSchema';
import type { Lang } from './zoneLayers';

export type FeatureCategory = 'poi' | 'route' | 'path' | 'contour';

/** Orden de prioridad al tocar el mapa: lo más específico primero. */
export const FEATURE_CATEGORIES: readonly FeatureCategory[] = ['poi', 'route', 'path', 'contour'];

const LAYER_NAMES: Record<FeatureCategory, readonly string[]> = {
  poi: ['poi', 'poi-label'],
  route: ['route', 'route-casing', 'route-ref'],
  path: ['track', 'path-ungraded', ...SAC_GRADES.map((g) => `path-${g}`)],
  contour: ['contour-index', 'contour-minor', 'contour-label'],
};

export function interactiveLayerIds(zoneIds: readonly string[], category: FeatureCategory): string[] {
  return zoneIds.flatMap((zoneId) => LAYER_NAMES[category].map((name) => `${zoneId}:${name}`));
}

export type FeatureInfo =
  | { category: 'poi'; kind: PoiKind | undefined; name: string | undefined; ele: number | undefined }
  | { category: 'route'; routeClass: RouteClass; name: string | undefined; ref: string | undefined }
  | { category: 'path'; highway: string | undefined; sac: SacGrade | undefined; name: string | undefined }
  | { category: 'contour'; ele: number | undefined };

type Props = Record<string, unknown> | null | undefined;

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, 120) : undefined;

const num = (value: unknown): number | undefined => {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : undefined;
};

const oneOf = <T extends string>(values: readonly T[], value: unknown): T | undefined =>
  values.find((v) => v === value);

/** Mismo orden de preferencia que `nameExpression` en el estilo. */
function localName(props: Props, lang: Lang): string | undefined {
  const localized =
    lang === 'en' ? (str(props?.['name:en']) ?? str(props?.name_en)) : str(props?.['name:es']);
  return localized ?? str(props?.name);
}

/** Normaliza las propiedades de una feature tocada; las teselas son datos externos y no se confía en su forma. */
export function describeFeature(category: FeatureCategory, props: Props, lang: Lang): FeatureInfo {
  switch (category) {
    case 'poi':
      return {
        category,
        kind: oneOf(POI_KINDS, props?.kind),
        name: localName(props, lang),
        ele: num(props?.ele),
      };
    case 'route':
      return {
        category,
        routeClass: oneOf(ROUTE_CLASSES, props?.ts_class) ?? 'OTHER',
        name: localName(props, lang),
        ref: str(props?.ref),
      };
    case 'path':
      return {
        category,
        highway: str(props?.highway),
        sac: oneOf(SAC_GRADES, props?.sac),
        name: localName(props, lang),
      };
    case 'contour':
      return { category, ele: num(props?.ele) };
  }
}
