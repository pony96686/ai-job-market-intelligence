import { useTranslations } from 'next-intl';
import { BillingView } from '@/components/billing/billing-view';

export default function BillingSettingsPage() {
  const t = useTranslations('billing');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('settingsTitle')}</h1>
      <BillingView />
    </div>
  );
}
