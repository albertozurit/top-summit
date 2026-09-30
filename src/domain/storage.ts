/** Espacio que siempre debe quedar libre en el iPhone tras descargar una zona. */
export const DEFAULT_FREE_SPACE_MARGIN_BYTES = 500 * 1024 * 1024;

export type SpaceCheck = { ok: true; remainingAfterBytes: number } | { ok: false; shortfallBytes: number };

export function checkSpace(
  requiredBytes: number,
  availableBytes: number,
  marginBytes: number = DEFAULT_FREE_SPACE_MARGIN_BYTES,
): SpaceCheck {
  const remaining = availableBytes - requiredBytes;
  if (remaining >= marginBytes) return { ok: true, remainingAfterBytes: remaining };
  return { ok: false, shortfallBytes: marginBytes - remaining };
}

export function formatBytes(bytes: number, locale = 'es-ES'): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = Math.max(bytes, 0);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value < 10 ? 1 : 0;
  const formatted = value.toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${formatted} ${units[unit]}`;
}
