import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

import { logger } from '@/lib/logger';

/** Mantiene la pantalla encendida mientras `active` sea true (descargas en primer plano). */
export function useKeepAwakeWhile(active: boolean, tag: string): void {
  useEffect(() => {
    if (!active) return;
    activateKeepAwakeAsync(tag).catch((e: unknown) => logger.warn('keepAwake', 'no disponible', e));
    return () => {
      deactivateKeepAwake(tag).catch(() => undefined);
    };
  }, [active, tag]);
}
