import { describeFeature, interactiveLayerIds } from './featureInfo';

describe('describeFeature', () => {
  it('normaliza una cima con elevación como texto', () => {
    expect(describeFeature('poi', { kind: 'peak', name: 'Aneto', ele: '3404.2' }, 'es')).toEqual({
      category: 'poi',
      kind: 'peak',
      name: 'Aneto',
      ele: 3404,
    });
  });

  it('usa el nombre localizado si existe', () => {
    const props = { name: 'Pic d’Aneto', 'name:es': 'Aneto', 'name:en': 'Aneto Peak' };
    expect(describeFeature('poi', props, 'en')).toMatchObject({ name: 'Aneto Peak' });
    expect(describeFeature('poi', props, 'es')).toMatchObject({ name: 'Aneto' });
  });

  it('descarta valores fuera del esquema', () => {
    expect(describeFeature('route', { ts_class: 'XX', ref: '  ' }, 'es')).toEqual({
      category: 'route',
      routeClass: 'OTHER',
      name: undefined,
      ref: undefined,
    });
    expect(describeFeature('path', { sac: 'T9', highway: 'path' }, 'es')).toMatchObject({ sac: undefined });
    expect(describeFeature('poi', { kind: 'bar', ele: 'alto' }, 'es')).toMatchObject({
      kind: undefined,
      ele: undefined,
    });
    expect(describeFeature('contour', null, 'es')).toEqual({ category: 'contour', ele: undefined });
  });
});

describe('interactiveLayerIds', () => {
  it('genera ids por zona coherentes con zoneLayers', () => {
    expect(interactiveLayerIds(['benasque'], 'route')).toEqual([
      'benasque:route',
      'benasque:route-casing',
      'benasque:route-ref',
    ]);
    expect(interactiveLayerIds(['a', 'b'], 'poi')).toHaveLength(4);
  });
});
