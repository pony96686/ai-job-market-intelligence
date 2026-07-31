'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchSubscription, createPortalSession } from '@/lib/api/billing';
import { PlanBadge } from './plan-badge';
import { UsageMeter } from './usage-meter';
import { UpgradeButton } from './upgrade-button';
import { OrderHistory } from './order-history';

export function BillingView() {
  const t = useTranslations('billing');
  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: fetchSubscription,
  });

  const portalMutation = useMutation({
    mutationFn: createPortalSession,
    onSuccess: (url) => {
      window.location.href = url;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-40" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const isPro = data.plan === 'PRO';

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('currentPlan')}</span>
            <PlanBadge plan={data.plan} />
          </div>

          {isPro ? (
            <>
              {data.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground">
                  {t('renews', { date: new Date(data.currentPeriodEnd).toLocaleDateString() })}
                </p>
              )}
              <Button
                variant="outline"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending ? t('opening') : t('manageSubscription')}
              </Button>
              {portalMutation.isError && <p className="text-sm text-destructive">{t('portalFailed')}</p>}
            </>
          ) : (
            <>
              <UsageMeter scoresToday={data.usage.scoresToday} scoresLimit={data.usage.scoresLimit} />
              <UpgradeButton />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <OrderHistory />
        </CardContent>
      </Card>
    </div>
  );
}
