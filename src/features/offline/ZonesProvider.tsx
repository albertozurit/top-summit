import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { ManifestZone } from '@/domain/manifest';
import { totalZoneBytes } from '@/domain/manifest';
import { err, ok, type Result } from '@/domain/result';
import { effectiveManifestUrl } from '@/domain/settings';
import { checkSpace, DEFAULT_FREE_SPACE_MARGIN_BYTES } from '@/domain/storage';
import type { ZoneRecord } from '@/domain/zoneRecord';
import {
  initialZoneStatus,
  restoredStatus,
  zoneReducer,
  type ZoneEvent,
  type ZoneStatus,
} from '@/domain/zoneState';
import { buildManifestUrl } from '@/platform/appInfo';
import { availableDiskSpace, deleteZone } from '@/platform/files';
import { useKeepAwakeWhile } from '@/platform/keepAwake';
import { logger } from '@/lib/logger';

import { useSettings } from '../settings/SettingsProvider';
import { fetchManifest, readCachedManifest, type ManifestSnapshot } from './manifestSource';
import { scanLocalZones, type LocalZone } from './localZones';
import { platformDownloadDeps } from './platformDeps';
import { discardDownload, ZoneDownload } from './zoneDownload';

export type ZoneActionError =
  { kind: 'busy' } | { kind: 'not_in_manifest' } | { kind: 'no_space'; shortfallBytes: number };

interface ZonesContextValue {
  manifestUrl: string | undefined;
  snapshot: ManifestSnapshot | undefined;
  manifestError: string | undefined;
  refreshing: boolean;
  local: Record<string, LocalZone>;
  statuses: Record<string, ZoneStatus>;
  /** Zonas verificadas en disco: las únicas que puede usar el mapa. */
  installed: ZoneRecord[];
  refreshManifest(): Promise<void>;
  download(zoneId: string): Result<true, ZoneActionError>;
  pause(zoneId: string): void;
  cancel(zoneId: string): void;
  remove(zoneId: string): void;
}

type StatusAction = { zoneId: string; event: ZoneEvent } | { reset: Record<string, ZoneStatus> };

function statusesReducer(
  state: Record<string, ZoneStatus>,
  action: StatusAction,
): Record<string, ZoneStatus> {
  if ('reset' in action) return action.reset;
  const current = state[action.zoneId] ?? initialZoneStatus;
  const next = zoneReducer(current, action.event);
  return next === current ? state : { ...state, [action.zoneId]: next };
}

const PROGRESS_INTERVAL_MS = 250;

const ZonesContext = createContext<ZonesContextValue | null>(null);

export function ZonesProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const manifestUrl = effectiveManifestUrl(settings, buildManifestUrl());

  const [local, setLocal] = useState<Record<string, LocalZone>>(() => scanLocalZones());
  const [statuses, dispatch] = useReducer(statusesReducer, local, (zones) =>
    Object.fromEntries(Object.values(zones).map((z) => [z.id, restoredStatus(z.disk, z.pending)])),
  );
  const cachedFor = (url: string | undefined) => ({
    url,
    snapshot: url ? readCachedManifest(url) : undefined,
  });
  const [manifestState, setManifestState] = useState(() => cachedFor(manifestUrl));
  if (manifestState.url !== manifestUrl) setManifestState(cachedFor(manifestUrl));
  const snapshot: ManifestSnapshot | undefined = manifestState.snapshot;
  const [manifestError, setManifestError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const active = useRef<{ zoneId: string; download: ZoneDownload } | null>(null);

  const rescan = useCallback(() => {
    const zones = scanLocalZones();
    setLocal(zones);
    return zones;
  }, []);

  const applyManifestResult = useCallback((result: Awaited<ReturnType<typeof fetchManifest>>) => {
    if (result.ok) {
      const fresh = result.value;
      setManifestState((prev) => (prev.url === fresh.url ? { url: fresh.url, snapshot: fresh } : prev));
      setManifestError(undefined);
    } else {
      logger.warn('zones', 'manifest no disponible', result.error);
      setManifestError(result.error);
    }
  }, []);

  const refreshManifest = useCallback(async () => {
    if (!manifestUrl) return;
    setRefreshing(true);
    const result = await fetchManifest(manifestUrl);
    setRefreshing(false);
    applyManifestResult(result);
  }, [manifestUrl, applyManifestResult]);

  useEffect(() => {
    if (!manifestUrl) return;
    let alive = true;
    void fetchManifest(manifestUrl).then((result) => alive && applyManifestResult(result));
    return () => {
      alive = false;
    };
  }, [manifestUrl, applyManifestResult]);

  const findZone = useCallback(
    (zoneId: string): ManifestZone | undefined => snapshot?.manifest.zones.find((z) => z.id === zoneId),
    [snapshot],
  );

  const download = useCallback(
    (zoneId: string): Result<true, ZoneActionError> => {
      if (active.current) return err({ kind: 'busy' });
      const zone = findZone(zoneId);
      if (!zone || !snapshot) return err({ kind: 'not_in_manifest' });

      const pending = local[zoneId]?.pending;
      const resumable = pending?.version === zone.version ? pending : undefined;
      const totalBytes = totalZoneBytes(zone);
      const remaining = totalBytes - (resumable?.completedBytes ?? 0);
      const space = checkSpace(remaining, availableDiskSpace(), DEFAULT_FREE_SPACE_MARGIN_BYTES);
      if (!space.ok) return err({ kind: 'no_space', shortfallBytes: space.shortfallBytes });

      const current = statuses[zoneId] ?? initialZoneStatus;
      if (current.status === 'paused' && resumable) {
        dispatch({ zoneId, event: { type: 'RESUME' } });
      } else {
        dispatch({ zoneId, event: { type: 'START', totalBytes, receivedBytes: resumable?.completedBytes } });
      }

      let lastEmit = 0;
      const job = new ZoneDownload(zone, snapshot.url, platformDownloadDeps, {
        onProgress(fileIndex, receivedBytes) {
          const now = Date.now();
          if (now - lastEmit < PROGRESS_INTERVAL_MS) return;
          lastEmit = now;
          dispatch({ zoneId, event: { type: 'PROGRESS', fileIndex, receivedBytes } });
        },
        onVerifying: () => dispatch({ zoneId, event: { type: 'DOWNLOADED' } }),
      });
      active.current = { zoneId, download: job };

      job
        .run(resumable)
        .then((result) => {
          switch (result.kind) {
            case 'completed':
              dispatch({ zoneId, event: { type: 'VERIFIED' } });
              break;
            case 'paused':
              dispatch({ zoneId, event: { type: 'PAUSED' } });
              break;
            case 'cancelled': {
              const zones = rescan();
              const z = zones[zoneId];
              dispatch({
                zoneId,
                event: { type: 'RESTORE', state: z ? restoredStatus(z.disk, undefined) : initialZoneStatus },
              });
              break;
            }
            case 'failed':
              dispatch({ zoneId, event: { type: 'FAILED', code: result.code, message: result.message } });
              break;
          }
        })
        .catch((e: unknown) => {
          logger.error('zones', 'fallo inesperado en la descarga', e);
          dispatch({
            zoneId,
            event: { type: 'FAILED', code: 'io', message: e instanceof Error ? e.message : String(e) },
          });
        })
        .finally(() => {
          active.current = null;
          rescan();
        });
      return ok(true);
    },
    [findZone, snapshot, local, statuses, rescan],
  );

  const pause = useCallback((zoneId: string) => {
    if (active.current?.zoneId === zoneId) active.current.download.pause();
  }, []);

  const cancel = useCallback(
    (zoneId: string) => {
      if (active.current?.zoneId === zoneId) {
        active.current.download.cancel();
        return;
      }
      discardDownload(zoneId, platformDownloadDeps);
      const zones = rescan();
      const z = zones[zoneId];
      dispatch({
        zoneId,
        event: { type: 'RESTORE', state: z ? restoredStatus(z.disk, undefined) : initialZoneStatus },
      });
    },
    [rescan],
  );

  const remove = useCallback(
    (zoneId: string) => {
      if (active.current?.zoneId === zoneId) return;
      dispatch({ zoneId, event: { type: 'DELETE' } });
      try {
        deleteZone(zoneId);
        dispatch({ zoneId, event: { type: 'DELETED' } });
      } catch (e) {
        dispatch({
          zoneId,
          event: { type: 'FAILED', code: 'io', message: e instanceof Error ? e.message : String(e) },
        });
      }
      rescan();
    },
    [rescan],
  );

  const downloading = Object.values(statuses).some(
    (s) => s.status === 'downloading' || s.status === 'verifying',
  );
  useKeepAwakeWhile(downloading, 'zone-download');

  const installed = useMemo(
    () =>
      Object.values(local)
        .filter((z) => z.disk === 'available' && z.record)
        .map((z) => z.record!),
    [local],
  );

  const value = useMemo<ZonesContextValue>(
    () => ({
      manifestUrl,
      snapshot,
      manifestError,
      refreshing,
      local,
      statuses,
      installed,
      refreshManifest,
      download,
      pause,
      cancel,
      remove,
    }),
    [
      manifestUrl,
      snapshot,
      manifestError,
      refreshing,
      local,
      statuses,
      installed,
      refreshManifest,
      download,
      pause,
      cancel,
      remove,
    ],
  );

  return <ZonesContext.Provider value={value}>{children}</ZonesContext.Provider>;
}

export function useZones(): ZonesContextValue {
  const value = useContext(ZonesContext);
  if (!value) throw new Error('useZones fuera de ZonesProvider');
  return value;
}
