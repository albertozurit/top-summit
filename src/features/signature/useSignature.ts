import { useEffect, useState } from 'react';

import { signatureStatus, type ProvisioningInfo, type SignatureStatus } from '@/domain/provisioning';
import { loadProvisioningInfo } from '@/platform/signature';

export type SignatureState =
  | { kind: 'loading' }
  | { kind: 'unknown' }
  | { kind: 'known'; info: ProvisioningInfo; status: SignatureStatus };

/** Caducidad de la firma leída del perfil embebido; se recalcula cada minuto. */
export function useSignature(): SignatureState {
  const [info, setInfo] = useState<ProvisioningInfo | null | undefined>(undefined);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let alive = true;
    void loadProvisioningInfo().then((value) => alive && setInfo(value));
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  if (info === undefined) return { kind: 'loading' };
  if (info === null) return { kind: 'unknown' };
  return { kind: 'known', info, status: signatureStatus(info.expiresAt, now) };
}
