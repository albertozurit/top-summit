import { bytesToLatin1, parseProvisioningProfile, type ProvisioningInfo } from '@/domain/provisioning';
import { logger } from '@/lib/logger';

import { readEmbeddedProvisioning } from './files';

/** `null` si la build no lleva perfil (simulador) o no se puede leer. */
export async function loadProvisioningInfo(): Promise<ProvisioningInfo | null> {
  try {
    const bytes = await readEmbeddedProvisioning();
    return bytes ? parseProvisioningProfile(bytesToLatin1(bytes)) : null;
  } catch (e) {
    logger.warn('signature', 'no se pudo leer embedded.mobileprovision', e);
    return null;
  }
}
