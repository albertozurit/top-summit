/**
 * Lectura de la caducidad de la firma a partir de `embedded.mobileprovision`.
 * El fichero es CMS (DER) pero contiene el plist XML en claro, así que basta con buscarlo en el texto.
 */

export interface ProvisioningInfo {
  expiresAt: Date;
  name?: string;
  teamName?: string;
}

export type SignatureLevel = 'ok' | 'warning' | 'critical' | 'expired';

export interface SignatureStatus {
  level: SignatureLevel;
  /** Días completos restantes (0 si caduca hoy; negativo si ya caducó). */
  daysLeft: number;
  hoursLeft: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function bytesToLatin1(bytes: Uint8Array): string {
  let out = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

function plistValue(text: string, key: string, tag: 'date' | 'string'): string | undefined {
  const re = new RegExp(`<key>${key}</key>\\s*<${tag}>([^<]*)</${tag}>`);
  return re.exec(text)?.[1];
}

export function parseProvisioningProfile(text: string): ProvisioningInfo | null {
  const expiration = plistValue(text, 'ExpirationDate', 'date');
  if (!expiration) return null;
  const expiresAt = new Date(expiration);
  if (Number.isNaN(expiresAt.getTime())) return null;
  const name = plistValue(text, 'Name', 'string');
  const teamName = plistValue(text, 'TeamName', 'string');
  return { expiresAt, ...(name ? { name } : {}), ...(teamName ? { teamName } : {}) };
}

/** `critical` cuando faltan menos de 2 días: con Apple ID gratuita hay que re-firmar antes de salir. */
export function signatureStatus(expiresAt: Date, now: Date): SignatureStatus {
  const remainingMs = expiresAt.getTime() - now.getTime();
  const daysLeft = Math.floor(remainingMs / DAY_MS);
  const hoursLeft = Math.floor(remainingMs / (60 * 60 * 1000));
  let level: SignatureLevel = 'ok';
  if (remainingMs <= 0) level = 'expired';
  else if (remainingMs < 2 * DAY_MS) level = 'critical';
  else if (remainingMs < 4 * DAY_MS) level = 'warning';
  return { level, daysLeft, hoursLeft };
}
