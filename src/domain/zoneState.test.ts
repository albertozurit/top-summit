import {
  initialZoneStatus,
  isBusy,
  progressFraction,
  restoredStatus,
  zoneReducer,
  type ZoneEvent,
  type ZoneStatus,
} from './zoneState';

describe('restoredStatus', () => {
  it('una descarga pendiente se restaura como pausada, aunque haya versión instalada', () => {
    expect(restoredStatus('available', { fileIndex: 1, completedBytes: 10, totalBytes: 20 })).toEqual({
      status: 'paused',
      fileIndex: 1,
      receivedBytes: 10,
      totalBytes: 20,
    });
  });
  it('refleja el estado en disco', () => {
    expect(restoredStatus('available', undefined)).toEqual({ status: 'available' });
    expect(restoredStatus('broken', undefined).status).toBe('error');
    expect(restoredStatus('absent', undefined)).toEqual(initialZoneStatus);
  });
});

const run = (events: ZoneEvent[], from: ZoneStatus = initialZoneStatus) => events.reduce(zoneReducer, from);

describe('zoneReducer', () => {
  it('recorre el camino feliz hasta disponible', () => {
    const state = run([
      { type: 'START', totalBytes: 100 },
      { type: 'PROGRESS', fileIndex: 0, receivedBytes: 40 },
      { type: 'PROGRESS', fileIndex: 1, receivedBytes: 100 },
      { type: 'DOWNLOADED' },
      { type: 'VERIFIED' },
    ]);
    expect(state).toEqual({ status: 'available' });
  });

  it('pausa y reanuda conservando el progreso', () => {
    const paused = run([
      { type: 'START', totalBytes: 100 },
      { type: 'PROGRESS', fileIndex: 0, receivedBytes: 30 },
      { type: 'PAUSED' },
    ]);
    expect(paused).toMatchObject({ status: 'paused', receivedBytes: 30 });
    expect(progressFraction(paused)).toBeCloseTo(0.3);
    expect(zoneReducer(paused, { type: 'RESUME' })).toMatchObject({
      status: 'downloading',
      receivedBytes: 30,
    });
  });

  it('cancelar vuelve a no instalada', () => {
    expect(run([{ type: 'START', totalBytes: 10 }, { type: 'CANCELLED' }])).toEqual(initialZoneStatus);
    expect(run([{ type: 'START', totalBytes: 10 }, { type: 'PAUSED' }, { type: 'CANCELLED' }])).toEqual(
      initialZoneStatus,
    );
  });

  it('una verificación fallida nunca deja la zona disponible', () => {
    const state = run([
      { type: 'START', totalBytes: 10 },
      { type: 'DOWNLOADED' },
      { type: 'FAILED', code: 'verify_md5', message: 'md5' },
      { type: 'VERIFIED' },
    ]);
    expect(state).toMatchObject({ status: 'error', code: 'verify_md5' });
  });

  it('ignora transiciones no válidas', () => {
    expect(zoneReducer(initialZoneStatus, { type: 'VERIFIED' })).toBe(initialZoneStatus);
    expect(zoneReducer(initialZoneStatus, { type: 'DELETE' })).toBe(initialZoneStatus);
    const available: ZoneStatus = { status: 'available' };
    expect(zoneReducer(available, { type: 'PAUSED' })).toBe(available);
  });

  it('limita el progreso al total', () => {
    const state = run([
      { type: 'START', totalBytes: 10 },
      { type: 'PROGRESS', fileIndex: 0, receivedBytes: 50 },
    ]);
    expect(state).toMatchObject({ receivedBytes: 10 });
  });

  it('borra una zona disponible o con error', () => {
    expect(run([{ type: 'DELETE' }, { type: 'DELETED' }], { status: 'available' })).toEqual(
      initialZoneStatus,
    );
    expect(run([{ type: 'DELETE' }], { status: 'error', code: 'io', message: '' })).toEqual({
      status: 'deleting',
    });
  });

  it('permite reintentar desde error y actualizar desde disponible', () => {
    expect(
      zoneReducer({ status: 'error', code: 'network', message: '' }, { type: 'START', totalBytes: 5 }),
    ).toMatchObject({
      status: 'downloading',
    });
    expect(zoneReducer({ status: 'available' }, { type: 'START', totalBytes: 5 })).toMatchObject({
      status: 'downloading',
    });
    expect(
      zoneReducer(
        { status: 'error', code: 'network', message: '' },
        { type: 'START', totalBytes: 5, receivedBytes: 3 },
      ),
    ).toMatchObject({ status: 'downloading', receivedBytes: 3 });
    expect(
      zoneReducer(
        { status: 'paused', fileIndex: 0, receivedBytes: 2, totalBytes: 5 },
        { type: 'START', totalBytes: 5 },
      ),
    ).toMatchObject({ status: 'downloading' });
  });

  it('isBusy', () => {
    expect(isBusy({ status: 'verifying', totalBytes: 1 })).toBe(true);
    expect(isBusy({ status: 'paused', fileIndex: 0, receivedBytes: 0, totalBytes: 1 })).toBe(false);
  });
});
