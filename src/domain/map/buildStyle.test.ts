import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import type { FeatureCollection } from 'geojson';

import { buildStyle, zonesContaining, type StyleZone } from './buildStyle';
import { FEATURE_CATEGORIES, interactiveLayerIds } from './featureInfo';

const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
const world = { land: empty, boundaries: empty };
const glyphsUrl = 'file:///docs/map-assets/glyphs/{fontstack}/{range}.pbf';

const zone = (id: string, raster: StyleZone['raster'] = 'hillshade'): StyleZone => ({
  id,
  vectorFileUri: `file:///docs/zones/${id}/vector.pmtiles`,
  ...(raster === 'none' ? {} : { rasterFileUri: `file:///docs/zones/${id}/raster.pmtiles` }),
  raster,
  bbox: [0.4, 42.5, 0.75, 42.75],
  attribution: ['© Colaboradores de OpenStreetMap', 'CC-BY 4.0 ign.es'],
});

describe('buildStyle', () => {
  it.each([
    ['sin zonas', []],
    ['una zona con relieve', [zone('benasque')]],
    ['una zona MTN25', [zone('benasque', 'mtn25')]],
    ['dos zonas', [zone('benasque'), zone('casa', 'none')]],
  ])('genera un estilo válido: %s', (_label, zones) => {
    const style = buildStyle({ zones, glyphsUrl, lang: 'es', world });
    const errors = validateStyleMin(style);
    expect(errors).toEqual([]);
  });

  it('solo referencia recursos locales', () => {
    const style = buildStyle({ zones: [zone('benasque')], glyphsUrl, lang: 'es', world });
    const json = JSON.stringify(style);
    expect(json).not.toMatch(/https?:\/\//);
    expect(style.sources['benasque:vector']).toMatchObject({
      url: 'pmtiles://file:///docs/zones/benasque/vector.pmtiles',
    });
  });

  it('intercala capas por grupo para que ninguna zona tape las etiquetas de otra', () => {
    const style = buildStyle({ zones: [zone('a'), zone('b')], glyphsUrl, lang: 'es', world });
    const ids = style.layers.map((l) => l.id);
    expect(ids.indexOf('b:landcover-wood')).toBeLessThan(ids.indexOf('a:route'));
    expect(ids.indexOf('b:route')).toBeLessThan(ids.indexOf('a:place-label'));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('dibuja las zonas del catálogo como polígonos', () => {
    const catalog = [{ id: 'aneto', name: 'Aneto', bbox: [0.5, 42.6, 0.7, 42.7] as StyleZone['bbox'] }];
    const style = buildStyle({ zones: [], glyphsUrl, lang: 'es', world, catalog });
    expect(validateStyleMin(style)).toEqual([]);
    const source = style.sources.catalog as { data: { features: unknown[] } };
    expect(source.data.features).toHaveLength(1);
    expect(style.layers.map((l) => l.id)).toContain('catalog-outline');
  });

  it('las capas interactivas existen en el estilo', () => {
    const style = buildStyle({ zones: [zone('benasque')], glyphsUrl, lang: 'es', world });
    const ids = new Set(style.layers.map((l) => l.id));
    for (const category of FEATURE_CATEGORIES) {
      for (const id of interactiveLayerIds(['benasque'], category)) expect(ids).toContain(id);
    }
  });

  it('diferencia GR/PR/SL por color', () => {
    const style = buildStyle({ zones: [zone('a')], glyphsUrl, lang: 'es', world });
    const route = style.layers.find((l) => l.id === 'a:route');
    const color = JSON.stringify(route && 'paint' in route ? route.paint : {});
    expect(color).toMatch(/"GR","#d62d20"/);
    expect(color).toMatch(/"PR","#f2b705"/);
    expect(color).toMatch(/"SL","#2e9e3e"/);
  });

  it('usa el nombre en el idioma pedido', () => {
    const en = JSON.stringify(buildStyle({ zones: [zone('a')], glyphsUrl, lang: 'en', world }));
    expect(en).toMatch(/name:en/);
  });
});

describe('zonesContaining', () => {
  it('encuentra las zonas que contienen un punto', () => {
    const zones = [zone('a')];
    expect(zonesContaining(zones, 0.5, 42.6)).toEqual(['a']);
    expect(zonesContaining(zones, -3.7, 40.4)).toEqual([]);
  });
});
