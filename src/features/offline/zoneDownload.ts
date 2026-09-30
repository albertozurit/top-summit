import type { DownloadPauseState, PendingDownload } from '@/domain/downloadState';
import { localFileName, resolveFileUrl, totalZoneBytes, type ManifestZone } from '@/domain/manifest';
import { recordFromManifestZone, type ZoneRecord } from '@/domain/zoneRecord';
import type { ZoneErrorCode } from '@/domain/zoneState';
import { verifyZoneFile, type FileEvidence } from '@/domain/verifyFile';

export interface Transfer {
  run(): Promise<{ kind: 'completed' } | { kind: 'paused'; pauseState: DownloadPauseState }>;
  pause(): void;
  cancel(): void;
}

/** Puertos hacia el sistema de ficheros y la red; se inyectan para poder probar la orquestación. */
export interface DownloadDeps {
  startTransfer(url: string, zoneId: string, fileName: string, onBytes: (bytes: number) => void): Transfer;
  resumeTransfer(state: DownloadPauseState, onBytes: (bytes: number) => void): Transfer;
  evidence(zoneId: string, fileName: string): FileEvidence;
  /** Sustituye `to` por `from` (el fichero anterior, si existe, se borra). */
  promote(zoneId: string, from: string, to: string): void;
  removeFile(zoneId: string, fileName: string): void;
  writePending(pending: PendingDownload): void;
  clearPending(zoneId: string): void;
  writeRecord(record: ZoneRecord): void;
  hasRecord(zoneId: string): boolean;
  deleteZoneDir(zoneId: string): void;
  now(): Date;
}

export type DownloadResult =
  | { kind: 'completed'; record: ZoneRecord }
  | { kind: 'paused' }
  | { kind: 'cancelled' }
  | { kind: 'failed'; code: ZoneErrorCode; message: string };

export interface DownloadCallbacks {
  onProgress(fileIndex: number, receivedBytes: number): void;
  onVerifying(): void;
}

/** Los ficheros se descargan con este sufijo: la versión instalada sigue usable hasta verificar la nueva. */
export const stagingName = (file: Pick<ManifestZone['files'][number], 'kind'>) =>
  `${localFileName(file)}.download`;

/**
 * Descarga secuencial de los ficheros de una zona, con pausa persistente, verificación
 * (tamaño → cabecera → md5) y activación atómica por fichero.
 */
export class ZoneDownload {
  private transfer: Transfer | undefined;
  private requested: 'pause' | 'cancel' | undefined;

  constructor(
    private readonly zone: ManifestZone,
    private readonly manifestUrl: string,
    private readonly deps: DownloadDeps,
    private readonly callbacks: DownloadCallbacks,
  ) {}

  pause(): void {
    this.requested = 'pause';
    this.transfer?.pause();
  }

  cancel(): void {
    this.requested = 'cancel';
    this.transfer?.cancel();
  }

  async run(pending?: PendingDownload): Promise<DownloadResult> {
    const { zone, deps } = this;
    const totalBytes = totalZoneBytes(zone);
    const resumable =
      pending && pending.version === zone.version && pending.zoneId === zone.id ? pending : undefined;
    let fileIndex = resumable?.fileIndex ?? 0;
    let completedBytes = zone.files.slice(0, fileIndex).reduce((sum, f) => sum + f.bytes, 0);

    for (; fileIndex < zone.files.length; fileIndex++) {
      const file = zone.files[fileIndex]!;
      const index = fileIndex;
      const base = completedBytes;
      const onBytes = (bytes: number) => this.callbacks.onProgress(index, base + bytes);
      const pauseState = resumable?.fileIndex === fileIndex ? resumable.pause : undefined;

      this.transfer = pauseState
        ? deps.resumeTransfer(pauseState, onBytes)
        : deps.startTransfer(resolveFileUrl(this.manifestUrl, file.url), zone.id, stagingName(file), onBytes);

      if (this.cancelRequested()) return this.discard();
      if (this.requested === 'pause') this.transfer.pause();

      let outcome: Awaited<ReturnType<Transfer['run']>>;
      try {
        outcome = await this.transfer.run();
      } catch (e) {
        if (this.cancelRequested()) return this.discard();
        this.savePending(fileIndex, completedBytes, totalBytes);
        return { kind: 'failed', code: 'network', message: e instanceof Error ? e.message : String(e) };
      } finally {
        this.transfer = undefined;
      }

      if (outcome.kind === 'paused') {
        if (this.cancelRequested()) return this.discard();
        this.savePending(fileIndex, completedBytes, totalBytes, outcome.pauseState);
        return { kind: 'paused' };
      }
      completedBytes += file.bytes;
      this.savePending(fileIndex + 1, completedBytes, totalBytes);
      if (this.cancelRequested()) return this.discard();
      if (this.requested === 'pause') return { kind: 'paused' };
    }

    this.callbacks.onVerifying();
    for (const file of zone.files) {
      const result = verifyZoneFile(file, deps.evidence(zone.id, stagingName(file)));
      if (!result.ok) {
        deps.removeFile(zone.id, stagingName(file));
        deps.clearPending(zone.id);
        return { kind: 'failed', code: result.error.code, message: result.error.message };
      }
    }

    for (const file of zone.files) deps.promote(zone.id, stagingName(file), localFileName(file));
    const record = recordFromManifestZone(zone, deps.now(), true);
    deps.writeRecord(record);
    deps.clearPending(zone.id);
    return { kind: 'completed', record };
  }

  private cancelRequested(): boolean {
    return this.requested === 'cancel';
  }

  private savePending(
    fileIndex: number,
    completedBytes: number,
    totalBytes: number,
    pause?: DownloadPauseState,
  ) {
    this.deps.writePending({
      schemaVersion: 1,
      zoneId: this.zone.id,
      version: this.zone.version,
      manifestUrl: this.manifestUrl,
      fileIndex,
      completedBytes,
      totalBytes,
      pause,
    });
  }

  private discard(): DownloadResult {
    discardDownload(this.zone.id, this.deps);
    return { kind: 'cancelled' };
  }
}

/** Borra lo descargado a medias. Si había una versión instalada, se conserva. */
export function discardDownload(zoneId: string, deps: DownloadDeps): void {
  for (const kind of ['vector', 'raster'] as const) deps.removeFile(zoneId, stagingName({ kind }));
  deps.clearPending(zoneId);
  if (!deps.hasRecord(zoneId)) deps.deleteZoneDir(zoneId);
}
