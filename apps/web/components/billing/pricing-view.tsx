'use client';

import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { UpgradeButton } from './upgrade-button';

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-4 w-4 text-green-600" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground" />
    );
  }
  return <span>{value}</span>;
}

export function PricingView({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useTranslations('pricing');

  const rows: Array<{ label: string; free: string | boolean; pro: string | boolean }> = [
    { label: t('aiScoring'), free: t('aiScoringFree'), pro: t('aiScoringPro') },
    { label: t('jobListings'), free: true, pro: true },
    { label: t('emailNotifications'), free: false, pro: true },
    { label: t('price'), free: t('priceFree'), pro: t('pricePro') },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('free')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <Cell value={row.free} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardHeader>
            <CardTitle>{t('pro')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <Cell value={row.pro} />
              </div>
            ))}
            <div className="pt-2">
              {isLoggedIn ? (
                <UpgradeButton />
              ) : (
                <Button asChild className="w-full">
                  <Link href="/login">{t('signInToUpgrade')}</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
