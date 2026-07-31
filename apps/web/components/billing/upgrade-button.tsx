'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { createCheckoutSession } from '@/lib/api/billing';

export function UpgradeButton() {
  const t = useTranslations('billing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(false);
    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={loading} className="w-full">
        {loading ? t('redirecting') : t('upgrade')}
      </Button>
      {error && <p className="text-sm text-destructive">{t('checkoutFailed')}</p>}
    </div>
  );
}
