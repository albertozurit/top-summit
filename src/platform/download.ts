import { DownloadTask, File } from 'expo-file-system';

import type { DownloadPauseState } from '@/domain/downloadState';

export type TransferOutcome = { kind: 'completed' } | { kind: 'paused'; pauseState: DownloadPauseState };

/**
 * Envoltorio mínimo sobre `DownloadTask` de expo-file-system: una transferencia de un
 * fichero con pausa serializable. La orquestación por zona vive en features/offline.
 */
export class FileTransfer {
  private readonly task: DownloadTask;
  private readonly resumed: boolean;

  private constructor(task: DownloadTask, resumed: boolean) {
    this.task = task;
    this.resumed = resumed;
  }

  static start(url: string, destination: File, onBytes: (bytesWritten: number) => void): FileTransfer {
    if (destination.exists) destination.delete();
    const task = File.createDownloadTask(url, destination, {
      sessionType: 'background',
      onProgress: ({ bytesWritten }) => onBytes(bytesWritten),
    });
    return new FileTransfer(task, false);
  }

  static resume(state: DownloadPauseState, onBytes: (bytesWritten: number) => void): FileTransfer {
    const task = DownloadTask.fromSavable(state, {
      sessionType: 'background',
      onProgress: ({ bytesWritten }) => onBytes(bytesWritten),
    });
    return new FileTransfer(task, true);
  }

  /** Resuelve al completar o pausar; rechaza en error de red o cancelación. */
  async run(): Promise<TransferOutcome> {
    const file = this.resumed ? await this.task.resumeAsync() : await this.task.downloadAsync();
    if (file) {
      this.task.release();
      return { kind: 'completed' };
    }
    return { kind: 'paused', pauseState: this.task.savable() };
  }

  pause(): void {
    this.task.pause();
  }

  cancel(): void {
    this.task.cancel();
  }
}
