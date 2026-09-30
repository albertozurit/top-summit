import { z } from 'zod';

import { isAllowedDataUrl } from './manifest';

export const settingsSchema = z.object({
  schemaVersion: z.literal(1),
  /** Fecha ISO en que se aceptó el aviso de limitaciones; ausente = mostrarlo. */
  limitationsAcceptedAt: z.string().optional(),
  /** URL del manifest; si falta se usa la del build (EXPO_PUBLIC_MANIFEST_URL). */
  manifestUrl: z.string().refine(isAllowedDataUrl).optional(),
  language: z.enum(['system', 'es', 'en']),
});

export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings: Settings = { schemaVersion: 1, language: 'system' };

/** Ajustes corruptos o de otra versión no bloquean la app: se vuelve a los valores por defecto. */
export function parseSettings(input: unknown): Settings {
  const parsed = settingsSchema.safeParse(input);
  return parsed.success ? parsed.data : defaultSettings;
}

export function effectiveManifestUrl(
  settings: Settings,
  buildDefault: string | undefined,
): string | undefined {
  const url = settings.manifestUrl ?? buildDefault;
  return url && isAllowedDataUrl(url) ? url : undefined;
}
