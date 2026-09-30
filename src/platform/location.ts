import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { logger } from '@/lib/logger';

export type LocationPermission =
  { state: 'unknown' } | { state: 'denied'; canAskAgain: boolean } | { state: 'granted'; precise: boolean };

export interface Fix {
  latitude: number;
  longitude: number;
  /** Radio de precisión horizontal (m). */
  accuracy: number | null;
  /** Altitud GPS (m). No se muestra sin su precisión vertical. */
  altitude: number | null;
  altitudeAccuracy: number | null;
  timestamp: number;
}

function toPermission(response: Location.LocationPermissionResponse): LocationPermission {
  if (response.granted) return { state: 'granted', precise: response.ios?.accuracy !== 'reduced' };
  if (response.status === Location.PermissionStatus.UNDETERMINED) return { state: 'unknown' };
  return { state: 'denied', canAskAgain: response.canAskAgain };
}

export async function getLocationPermission(): Promise<LocationPermission> {
  return toPermission(await Location.getForegroundPermissionsAsync());
}

export async function requestLocationPermission(): Promise<LocationPermission> {
  return toPermission(await Location.requestForegroundPermissionsAsync());
}

/** Estado del permiso, re-consultado al volver a la app (p. ej. desde Ajustes de iOS). */
export function useLocationPermission(): { permission: LocationPermission; request: () => Promise<void> } {
  const [permission, setPermission] = useState<LocationPermission>({ state: 'unknown' });

  useEffect(() => {
    const refresh = () => {
      getLocationPermission()
        .then(setPermission)
        .catch((e: unknown) => logger.warn('location', 'no se pudo leer el permiso', e));
    };
    refresh();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, []);

  const request = useCallback(async () => {
    setPermission(await requestLocationPermission());
  }, []);

  return { permission, request };
}

/** Seguimiento en primer plano (M1–M2). El tracking en segundo plano será un módulo nativo en M3. */
export function useForegroundFix(enabled: boolean): { fix: Fix | null; error: string | null } {
  const [fix, setFix] = useState<Fix | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
      ({ coords, timestamp }) => {
        setError(null);
        setFix({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude,
          altitudeAccuracy: coords.altitudeAccuracy,
          timestamp,
        });
      },
      (reason) => {
        logger.warn('location', 'error de ubicación', reason);
        setError(reason);
      },
    )
      .then((sub) => {
        if (cancelled) sub.remove();
        else subscription = sub;
      })
      .catch((e: unknown) => setError(String(e)));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  return { fix, error };
}
