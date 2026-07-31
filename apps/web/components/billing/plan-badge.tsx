import { useTranslations } from 'next-intl';
import type { PlanTier } from '@ai-job-market-intelligence/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function PlanBadge({ plan }: { plan: PlanTier }) {
  const t = useTranslations('billing');

  return (
    <Badge className={cn(plan === 'PRO' && 'bg-primary text-primary-foreground')}>
      {plan === 'PRO' ? t('planPro') : t('planFree')}
    </Badge>
  );
}
