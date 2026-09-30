import type { ZoneFile } from './manifest';
import { parsePmtilesHeader, validatePmtilesHeader } from './pmtilesHeader';
import { err, ok, type Result } from './result';
import type { ZoneErrorCode } from './zoneState';

export interface FileEvidence {
  /** Tamaño real en disco; undefined si el fichero no existe. */
  bytes: number | undefined;
  header: Uint8Array | undefined;
  md5: string | undefined;
}

export type VerifyError = {
  code: Extract<ZoneErrorCode, 'verify_size' | 'verify_header' | 'verify_md5'>;
  message: string;
};

/**
 * Verificación de un fichero descargado, de la comprobación más barata a la más cara.
 * Una zona solo se marca como disponible si todos sus ficheros pasan.
 */
export function verifyZoneFile(expected: ZoneFile, evidence: FileEvidence): Result<true, VerifyError> {
  if (evidence.bytes !== expected.bytes) {
    return err({
      code: 'verify_size',
      message: `${expected.kind}: tamaño ${evidence.bytes ?? 'ausente'} ≠ ${expected.bytes}`,
    });
  }
  if (!evidence.header) return err({ code: 'verify_header', message: `${expected.kind}: sin cabecera` });
  const header = parsePmtilesHeader(evidence.header);
  if (!header.ok) return err({ code: 'verify_header', message: `${expected.kind}: ${header.error}` });
  const valid = validatePmtilesHeader(header.value, { kind: expected.kind, fileBytes: expected.bytes });
  if (!valid.ok) return err({ code: 'verify_header', message: `${expected.kind}: ${valid.error}` });
  if (evidence.md5?.toLowerCase() !== expected.md5) {
    return err({ code: 'verify_md5', message: `${expected.kind}: md5 no coincide` });
  }
  return ok(true);
}
