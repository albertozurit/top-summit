import { validManifest } from '@/domain/__fixtures__/manifest';
import { pmtilesHeaderBytes } from '@/domain/__fixtures__/pmtiles';
import type { DownloadPauseState, PendingDownload } from '@/domain/downloadState';
import type { ManifestZone } from '@/domain/manifest';
import { TileType } from '@/domain/pmtilesHeader';
import type { ZoneRecord } from '@/domain/zoneRecord';

import { discardDownload, ZoneDownload, type DownloadDeps, type Transfer } from './zoneDownload';

const MANIFEST_URL = 'https://github.com/u/r/releases/download/zones-1/manifest.json';

type Behaviour = 'complete' | 'fail' | 'pause' | 'hang';

const makeZone = (): ManifestZone => validManifest().zones[0]!;

function fakeDeps(zone: ManifestZone, behaviours: Behaviour[]) {
  const files = new Map<string, { bytes: number; md5: string; header: Uint8Array }>();
  const log: string[] = [];
  const state = {
    pending: undefined as PendingDownload | undefined,
    record: undefined as ZoneRecord | undefined,
    corruptMd5: false,
    dirDeleted: false,
  };
  let call = 0;
  const transfers: { cancel: jest.Mock; pause: jest.Mock }[] = [];

  const makeTransfer = (name: string, onBytes: (b: number) => void, kind: 'vector' | 'raster'): Transfer => {
    const behaviour = behaviours[call++] ?? 'complete';
    const expected = zone.files.find((f) => f.kind === kind)!;
    let rejectRun: ((e: Error) => void) | undefined;
    let resolveRun: ((v: { kind: 'paused'; pauseState: DownloadPauseState }) => void) | undefined;
    const t = {
      cancel: jest.fn(() => rejectRun?.(new Error('cancelled'))),
      pause: jest.fn(() =>
        resolveRun?.({
          kind: 'paused',
          pauseState: { url: 'u', fileUri: name, isDirectory: false, resumeData: 'r' },
        }),
      ),
    };
    transfers.push(t);
    return {
      ...t,
      run: () =>
        new Promise((resolve, reject) => {
          rejectRun = reject;
          resolveRun = resolve;
          if (behaviour === 'hang') return;
          if (behaviour === 'fail') return reject(new Error('timeout'));
          onBytes(expected.bytes / 2);
          if (behaviour === 'pause') return t.pause();
          files.set(name, {
            bytes: expected.bytes,
            md5: state.corruptMd5 ? 'f'.repeat(32) : expected.md5,
            header: pmtilesHeaderBytes({
              tileType: kind === 'vector' ? TileType.mvt : TileType.png,
              tileDataOffset: 100,
              tileDataLength: expected.bytes - 200,
            }),
          });
          resolve({ kind: 'completed' });
        }),
    };
  };

  const deps: DownloadDeps = {
    startTransfer: (url, _zoneId, fileName, onBytes) => {
      log.push(`start ${url}`);
      return makeTransfer(fileName, onBytes, fileName.startsWith('vector') ? 'vector' : 'raster');
    },
    resumeTransfer: (pauseState, onBytes) => {
      log.push(`resume ${pauseState.fileUri}`);
      return makeTransfer(
        pauseState.fileUri,
        onBytes,
        pauseState.fileUri.startsWith('vector') ? 'vector' : 'raster',
      );
    },
    evidence: (_zoneId, fileName) => {
      const f = files.get(fileName);
      return { bytes: f?.bytes, header: f?.header, md5: f?.md5 };
    },
    promote: (_zoneId, from, to) => {
      files.set(to, files.get(from)!);
      files.delete(from);
    },
    removeFile: (_zoneId, fileName) => void files.delete(fileName),
    writePending: (p) => void (state.pending = p),
    clearPending: () => void (state.pending = undefined),
    writeRecord: (r) => void (state.record = r),
    hasRecord: () => state.record !== undefined,
    deleteZoneDir: () => void (state.dirDeleted = true),
    now: () => new Date('2026-09-30T12:00:00Z'),
  };
  return { deps, files, log, state, transfers };
}

const callbacks = () => ({ onProgress: jest.fn(), onVerifying: jest.fn() });

describe('ZoneDownload', () => {
  it('descarga, verifica y activa todos los ficheros', async () => {
    const zone = makeZone();
    const { deps, files, log, state } = fakeDeps(zone, ['complete', 'complete']);
    const cb = callbacks();
    const result = await new ZoneDownload(zone, MANIFEST_URL, deps, cb).run();

    expect(result.kind).toBe('completed');
    expect(log[0]).toBe('start https://github.com/u/r/releases/download/zones-1/benasque-vector.pmtiles');
    expect(log[1]).toBe('start https://example.com/benasque-raster.pmtiles');
    expect([...files.keys()].sort()).toEqual(['raster.pmtiles', 'vector.pmtiles']);
    expect(state.record?.verified).toBe(true);
    expect(state.pending).toBeUndefined();
    expect(cb.onProgress).toHaveBeenCalledWith(1, 1000 + 250);
    expect(cb.onVerifying).toHaveBeenCalled();
  });

  it('persiste la pausa y reanuda desde el fichero pendiente', async () => {
    const zone = makeZone();
    const fake = fakeDeps(zone, ['complete', 'pause', 'complete']);
    const first = await new ZoneDownload(zone, MANIFEST_URL, fake.deps, callbacks()).run();
    expect(first.kind).toBe('paused');
    expect(fake.state.pending).toMatchObject({
      fileIndex: 1,
      completedBytes: 1000,
      pause: { resumeData: 'r' },
    });

    const second = await new ZoneDownload(zone, MANIFEST_URL, fake.deps, callbacks()).run(fake.state.pending);
    expect(second.kind).toBe('completed');
    expect(fake.log).toEqual([
      expect.stringContaining('start'),
      expect.stringContaining('start'),
      'resume raster.pmtiles.download',
    ]);
  });

  it('ignora un download.json de otra versión', async () => {
    const zone = makeZone();
    const fake = fakeDeps(zone, []);
    const stale: PendingDownload = {
      schemaVersion: 1,
      zoneId: zone.id,
      version: 'vieja',
      manifestUrl: MANIFEST_URL,
      fileIndex: 1,
      completedBytes: 1000,
      totalBytes: 1500,
    };
    await new ZoneDownload(zone, MANIFEST_URL, fake.deps, callbacks()).run(stale);
    expect(fake.log[0]).toContain('vector.pmtiles');
  });

  it('un error de red deja la descarga reanudable', async () => {
    const zone = makeZone();
    const fake = fakeDeps(zone, ['complete', 'fail']);
    const result = await new ZoneDownload(zone, MANIFEST_URL, fake.deps, callbacks()).run();
    expect(result).toMatchObject({ kind: 'failed', code: 'network' });
    expect(fake.state.pending).toMatchObject({ fileIndex: 1, completedBytes: 1000 });
    expect(fake.state.record).toBeUndefined();
  });

  it('no marca disponible una zona con md5 incorrecto', async () => {
    const zone = makeZone();
    const fake = fakeDeps(zone, []);
    fake.state.corruptMd5 = true;
    const result = await new ZoneDownload(zone, MANIFEST_URL, fake.deps, callbacks()).run();
    expect(result).toMatchObject({ kind: 'failed', code: 'verify_md5' });
    expect(fake.state.record).toBeUndefined();
    expect(fake.files.has('vector.pmtiles')).toBe(false);
  });

  it('cancelar borra lo parcial y la carpeta si no había versión instalada', async () => {
    const zone = makeZone();
    const fake = fakeDeps(zone, ['hang']);
    const download = new ZoneDownload(zone, MANIFEST_URL, fake.deps, callbacks());
    const running = download.run();
    await Promise.resolve();
    download.cancel();
    expect(await running).toEqual({ kind: 'cancelled' });
    expect(fake.state.pending).toBeUndefined();
    expect(fake.state.dirDeleted).toBe(true);
  });

  it('cancelar una actualización conserva la versión instalada', () => {
    const zone = makeZone();
    const fake = fakeDeps(zone, []);
    fake.state.record = { id: zone.id } as ZoneRecord;
    fake.files.set('vector.pmtiles', { bytes: 1, md5: '', header: new Uint8Array() });
    fake.files.set('vector.pmtiles.download', { bytes: 1, md5: '', header: new Uint8Array() });
    discardDownload(zone.id, fake.deps);
    expect([...fake.files.keys()]).toEqual(['vector.pmtiles']);
    expect(fake.state.dirDeleted).toBe(false);
  });
});
