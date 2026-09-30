import { z } from 'zod';

/**
 * Estado persistido (`Documents/zones/<id>/download.json`) para reanudar una descarga
 * después de cerrar la app. `pause` es el valor opaco de `DownloadTask.savable()`.
 */
export const pendingDownloadSchema = z.object({
  schemaVersion: z.literal(1),
  zoneId: z.string(),
  version: z.string(),
  manifestUrl: z.string(),
  fileIndex: z.number().int().min(0),
  completedBytes: z.number().int().min(0),
  totalBytes: z.number().int().positive(),
  pause: z
    .object({
      url: z.string(),
      fileUri: z.string(),
      isDirectory: z.boolean(),
      headers: z.record(z.string(), z.string()).optional(),
      resumeData: z.string().optional(),
    })
    .optional(),
});

export type PendingDownload = z.infer<typeof pendingDownloadSchema>;
export type DownloadPauseState = NonNullable<PendingDownload['pause']>;
