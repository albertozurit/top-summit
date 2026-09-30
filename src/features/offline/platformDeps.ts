import { FileTransfer } from '@/platform/download';
import {
  clearPendingDownload,
  deleteZone,
  fileMd5,
  readFileHeader,
  readZoneRecord,
  writePendingDownload,
  writeZoneRecord,
  zoneFile,
} from '@/platform/files';

import type { DownloadDeps } from './zoneDownload';

export const platformDownloadDeps: DownloadDeps = {
  startTransfer: (url, zoneId, fileName, onBytes) =>
    FileTransfer.start(url, zoneFile(zoneId, fileName), onBytes),
  resumeTransfer: (state, onBytes) => FileTransfer.resume(state, onBytes),
  evidence(zoneId, fileName) {
    const file = zoneFile(zoneId, fileName);
    if (!file.exists) return { bytes: undefined, header: undefined, md5: undefined };
    return { bytes: file.size, header: readFileHeader(file), md5: fileMd5(file) };
  },
  promote(zoneId, from, to) {
    const target = zoneFile(zoneId, to);
    if (target.exists) target.delete();
    zoneFile(zoneId, from).moveSync(target);
  },
  removeFile(zoneId, fileName) {
    const file = zoneFile(zoneId, fileName);
    if (file.exists) file.delete();
  },
  writePending: writePendingDownload,
  clearPending: clearPendingDownload,
  writeRecord: writeZoneRecord,
  hasRecord: (zoneId) => readZoneRecord(zoneId) !== undefined,
  deleteZoneDir: deleteZone,
  now: () => new Date(),
};
