import type { Manifest } from '../manifest';

export const validManifest = (): Manifest => ({
  schemaVersion: 1,
  generatedAt: '2026-09-30T10:00:00Z',
  zones: [
    {
      id: 'benasque',
      name: 'Valle de Benasque',
      version: '2026-09-29.1',
      bbox: [0.4, 42.5, 0.75, 42.75],
      minZoom: 0,
      maxZoom: 14,
      osmDate: '2026-09-29',
      demSource: 'copernicus-glo30',
      raster: 'hillshade',
      attribution: ['© Colaboradores de OpenStreetMap'],
      files: [
        { kind: 'vector', url: 'benasque-vector.pmtiles', bytes: 1000, md5: 'a'.repeat(32) },
        {
          kind: 'raster',
          url: 'https://example.com/benasque-raster.pmtiles',
          bytes: 500,
          md5: 'b'.repeat(32),
        },
      ],
    },
  ],
});
