import { Camera, Map as MapView } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { BBox } from '@/domain/manifest';
import type { Lang } from '@/domain/map/zoneLayers';
import { radius } from '@/ui/theme';

import { useMapStyle } from '../map/useMapStyle';
import { useZones } from './ZonesProvider';

function union(boxes: BBox[]): BBox | undefined {
  if (boxes.length === 0) return undefined;
  return boxes.reduce<BBox>(
    ([w, s, e, n], [w2, s2, e2, n2]) => [Math.min(w, w2), Math.min(s, s2), Math.max(e, e2), Math.max(n, n2)],
    boxes[0]!,
  );
}

/** Mapa pequeño con las zonas instaladas (contorno discontinuo) y las del catálogo (azul). */
export function ZonesMap() {
  const { i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'es';
  const { installed, snapshot } = useZones();

  const catalog = useMemo(() => {
    const installedIds = new Set(installed.map((z) => z.id));
    return (snapshot?.manifest.zones ?? [])
      .filter((z) => !installedIds.has(z.id))
      .map((z) => ({ id: z.id, name: z.name, bbox: z.bbox }));
  }, [installed, snapshot]);

  const { style, key } = useMapStyle(installed, lang, catalog);
  const bounds = union([...installed.map((z) => z.bbox), ...catalog.map((z) => z.bbox)]);

  return (
    <View style={styles.container}>
      <MapView
        attribution={false}
        logo={false}
        mapStyle={style}
        style={styles.map}
        key={`${key}|${catalog.length}`}
      >
        <Camera
          initialViewState={
            bounds
              ? { bounds, padding: { top: 24, right: 24, bottom: 24, left: 24 } }
              : { center: [-3.7, 40.2], zoom: 4.5 }
          }
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: radius.md, height: 220, overflow: 'hidden' },
  map: { flex: 1 },
});
