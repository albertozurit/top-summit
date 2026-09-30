import {
  Camera,
  Map as MapView,
  NativeUserLocation,
  type MapRef,
  type PressEvent,
  type TrackUserLocation,
} from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, View, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WORLD_ATTRIBUTION, zonesContaining } from '@/domain/map/buildStyle';
import {
  describeFeature,
  FEATURE_CATEGORIES,
  interactiveLayerIds,
  type FeatureInfo,
} from '@/domain/map/featureInfo';
import type { Lang } from '@/domain/map/zoneLayers';
import { logger } from '@/lib/logger';
import { useForegroundFix, useLocationPermission } from '@/platform/location';
import { useIsOnline } from '@/platform/network';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { colors, radius, spacing } from '@/ui/theme';

import { useZones } from '../offline/ZonesProvider';
import { SignatureBanner } from '../signature/SignatureBanner';
import { FeatureCard } from './FeatureCard';
import { GpsPanel } from './GpsPanel';
import { useMapStyle } from './useMapStyle';

const SPAIN_CENTER: [number, number] = [-3.7, 40.2];
const TAP_TOLERANCE_PX = 12;
const FOLLOW_CYCLE: (TrackUserLocation | undefined)[] = [undefined, 'default', 'heading'];

export function MapScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'es';

  const { installed } = useZones();
  const { style, key } = useMapStyle(installed, lang);
  const { permission, request } = useLocationPermission();
  const granted = permission.state === 'granted';
  const { fix, error } = useForegroundFix(granted);
  const online = useIsOnline();

  const mapRef = useRef<MapRef>(null);
  const [follow, setFollow] = useState<TrackUserLocation | undefined>(undefined);
  const [selected, setSelected] = useState<FeatureInfo | null>(null);

  const initialViewState = useMemo(() => {
    const first = installed[0];
    return first
      ? { bounds: first.bbox, padding: { top: 40, right: 40, bottom: 40, left: 40 } }
      : { center: SPAIN_CENTER, zoom: 5 };
    // Solo la vista inicial al montar; no debe recolocar el mapa cuando cambian las zonas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const outsideZones =
    fix !== null &&
    installed.length > 0 &&
    zonesContaining(installed, fix.longitude, fix.latitude).length === 0;

  const attribution = useMemo(() => {
    const parts = new Set(installed.flatMap((z) => z.attribution));
    parts.add(WORLD_ATTRIBUTION);
    return [...parts].join(' · ');
  }, [installed]);

  const onPress = useCallback(
    async (event: NativeSyntheticEvent<PressEvent>) => {
      const [x, y] = event.nativeEvent.point;
      const zoneIds = installed.map((z) => z.id);
      if (zoneIds.length === 0) return;
      const box: [[number, number], [number, number]] = [
        [x - TAP_TOLERANCE_PX, y - TAP_TOLERANCE_PX],
        [x + TAP_TOLERANCE_PX, y + TAP_TOLERANCE_PX],
      ];
      try {
        for (const category of FEATURE_CATEGORIES) {
          const features = await mapRef.current?.queryRenderedFeatures(box, {
            layers: interactiveLayerIds(zoneIds, category),
          });
          const first = features?.[0];
          if (first) {
            setSelected(describeFeature(category, first.properties, lang));
            return;
          }
        }
        setSelected(null);
      } catch (e) {
        logger.warn('map', 'queryRenderedFeatures falló', e);
      }
    },
    [installed, lang],
  );

  const cycleFollow = () => {
    const index = FOLLOW_CYCLE.indexOf(follow);
    setFollow(FOLLOW_CYCLE[(index + 1) % FOLLOW_CYCLE.length]);
  };
  const followLabel =
    follow === undefined
      ? t('map.follow')
      : follow === 'default'
        ? t('map.followHeading')
        : t('map.stopFollow');

  return (
    <View style={styles.root}>
      <MapView
        attribution={false}
        compass
        compassPosition={{ top: insets.top + 110, right: spacing.md }}
        key={key}
        logo={false}
        mapStyle={style}
        onPress={onPress}
        ref={mapRef}
        scaleBar
        scaleBarPosition={{ bottom: insets.bottom + 150, left: spacing.md }}
        style={styles.map}
      >
        <Camera
          initialViewState={initialViewState}
          onTrackUserLocationChange={(e) => {
            if (e.nativeEvent.trackUserLocation === null) setFollow(undefined);
          }}
          trackUserLocation={granted ? follow : undefined}
        />
        {granted && <NativeUserLocation mode={follow === 'heading' ? 'heading' : 'default'} />}
      </MapView>

      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <SignatureBanner />
        {online === false && <Banner tone="info" text={t('map.offline')} />}
        {installed.length === 0 && (
          <Banner tone="warning" text={t('map.noZones')} onPress={() => router.push('/zones')} />
        )}
        {outsideZones && <Banner tone="warning" text={t('map.outsideZones')} />}
        {permission.state === 'unknown' && (
          <Button compact label={t('gps.permissionAsk')} onPress={() => void request()} />
        )}
        {permission.state === 'denied' &&
          (permission.canAskAgain ? (
            <Button compact label={t('gps.permissionAsk')} onPress={() => void request()} />
          ) : (
            <Banner
              tone="danger"
              text={t('gps.permissionDenied')}
              onPress={() => void Linking.openSettings()}
            />
          ))}
        {permission.state === 'granted' && !permission.precise && (
          <Banner tone="danger" text={t('gps.reducedAccuracy')} onPress={() => void Linking.openSettings()} />
        )}
      </View>

      <View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: insets.bottom + spacing.sm }]}>
        {selected && <FeatureCard info={selected} onClose={() => setSelected(null)} />}
        {granted && <GpsPanel error={error} fix={fix} />}
        <View style={styles.toolbar}>
          <Button compact disabled={!granted} label={followLabel} onPress={cycleFollow} />
          <Button compact label={t('map.zones')} onPress={() => router.push('/zones')} variant="secondary" />
          <Button
            compact
            label={t('map.legend')}
            onPress={() => router.push('/legend')}
            variant="secondary"
          />
          <Button
            compact
            label={t('map.settings')}
            onPress={() => router.push('/settings')}
            variant="secondary"
          />
        </View>
        <Pressable accessibilityRole="link" onPress={() => router.push('/settings')}>
          <Text numberOfLines={2} style={styles.attribution}>
            {t('map.attributionPrefix')} {attribution}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },
  top: { gap: spacing.sm, left: spacing.md, position: 'absolute', right: spacing.md, top: 0 },
  bottom: { bottom: 0, gap: spacing.sm, left: spacing.md, position: 'absolute', right: spacing.md },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  attribution: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: radius.sm,
    color: colors.textMuted,
    fontSize: 10,
    paddingHorizontal: spacing.xs,
  },
});
