import { useTranslation } from 'react-i18next';

import { Banner } from '@/ui/Banner';

import { useSignature } from './useSignature';

export function SignatureBanner() {
  const { t } = useTranslation();
  const signature = useSignature();
  if (signature.kind !== 'known') return null;
  const { level, daysLeft, hoursLeft } = signature.status;
  if (level === 'ok') return null;
  if (level === 'expired') return <Banner tone="danger" text={t('signature.expired')} />;
  if (level === 'critical')
    return <Banner tone="danger" text={t('signature.critical', { hours: hoursLeft })} />;
  return <Banner tone="warning" text={t('signature.warning', { days: daysLeft })} />;
}
