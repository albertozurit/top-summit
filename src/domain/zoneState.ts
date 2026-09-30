/**
 * Máquina de estados de una zona offline (función pura). Las transiciones no válidas
 * devuelven el mismo estado: la UI nunca puede dejar una zona en un estado incoherente.
 */

export type ZoneErrorCode =
  'network' | 'no_space' | 'verify_size' | 'verify_md5' | 'verify_header' | 'io' | 'manifest' | 'unknown';

export type ZoneStatus =
  | { status: 'not_installed' }
  | { status: 'downloading'; fileIndex: number; receivedBytes: number; totalBytes: number }
  | { status: 'paused'; fileIndex: number; receivedBytes: number; totalBytes: number }
  | { status: 'verifying'; totalBytes: number }
  | { status: 'available' }
  | { status: 'error'; code: ZoneErrorCode; message: string }
  | { status: 'deleting' };

export type ZoneEvent =
  /** `receivedBytes` > 0 al reanudar una descarga con ficheros ya completos. */
  | { type: 'START'; totalBytes: number; receivedBytes?: number }
  | { type: 'PROGRESS'; fileIndex: number; receivedBytes: number }
  | { type: 'PAUSED' }
  | { type: 'RESUME' }
  | { type: 'DOWNLOADED' }
  | { type: 'VERIFIED' }
  | { type: 'FAILED'; code: ZoneErrorCode; message: string }
  | { type: 'CANCELLED' }
  | { type: 'DELETE' }
  | { type: 'DELETED' }
  | { type: 'RESTORE'; state: ZoneStatus };

export const initialZoneStatus: ZoneStatus = { status: 'not_installed' };

export function zoneReducer(state: ZoneStatus, event: ZoneEvent): ZoneStatus {
  switch (event.type) {
    case 'RESTORE':
      return event.state;
    case 'START':
      if (
        state.status === 'not_installed' ||
        state.status === 'error' ||
        state.status === 'available' ||
        state.status === 'paused'
      ) {
        return {
          status: 'downloading',
          fileIndex: 0,
          receivedBytes: Math.min(Math.max(event.receivedBytes ?? 0, 0), event.totalBytes),
          totalBytes: event.totalBytes,
        };
      }
      return state;
    case 'PROGRESS':
      if (state.status === 'downloading') {
        return {
          ...state,
          fileIndex: event.fileIndex,
          receivedBytes: Math.min(Math.max(event.receivedBytes, 0), state.totalBytes),
        };
      }
      return state;
    case 'PAUSED':
      return state.status === 'downloading' ? { ...state, status: 'paused' } : state;
    case 'RESUME':
      return state.status === 'paused' ? { ...state, status: 'downloading' } : state;
    case 'DOWNLOADED':
      return state.status === 'downloading' ? { status: 'verifying', totalBytes: state.totalBytes } : state;
    case 'VERIFIED':
      return state.status === 'verifying' ? { status: 'available' } : state;
    case 'FAILED':
      if (
        state.status === 'downloading' ||
        state.status === 'paused' ||
        state.status === 'verifying' ||
        state.status === 'deleting'
      ) {
        return { status: 'error', code: event.code, message: event.message };
      }
      return state;
    case 'CANCELLED':
      return state.status === 'downloading' || state.status === 'paused'
        ? { status: 'not_installed' }
        : state;
    case 'DELETE':
      return state.status === 'available' || state.status === 'error' ? { status: 'deleting' } : state;
    case 'DELETED':
      return state.status === 'deleting' ? { status: 'not_installed' } : state;
  }
}

export function progressFraction(state: ZoneStatus): number | null {
  if (state.status === 'downloading' || state.status === 'paused') {
    return state.totalBytes > 0 ? state.receivedBytes / state.totalBytes : 0;
  }
  return null;
}

/** Estado inicial de una zona al arrancar, reconstruido solo a partir de lo que hay en disco. */
export function restoredStatus(
  disk: 'available' | 'broken' | 'absent',
  pending: { fileIndex: number; completedBytes: number; totalBytes: number } | undefined,
): ZoneStatus {
  if (pending) {
    return {
      status: 'paused',
      fileIndex: pending.fileIndex,
      receivedBytes: Math.min(pending.completedBytes, pending.totalBytes),
      totalBytes: pending.totalBytes,
    };
  }
  if (disk === 'available') return { status: 'available' };
  if (disk === 'broken') return { status: 'error', code: 'verify_size', message: 'zona incompleta o dañada' };
  return initialZoneStatus;
}

export function isBusy(state: ZoneStatus): boolean {
  return state.status === 'downloading' || state.status === 'verifying' || state.status === 'deleting';
}
