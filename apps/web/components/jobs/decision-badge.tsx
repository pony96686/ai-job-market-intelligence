import { useTranslations } from 'next-intl';
import type { JobDecision } from '@ai-job-market-intelligence/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DECISION_STYLES: Record<JobDecision, string> = {
  APPLY: 'bg-green-500 text-white',
  MAYBE: 'bg-yellow-500 text-white',
  SKIP: 'bg-gray-400 text-white',
};

export function DecisionBadge({ decision }: { decision: JobDecision }) {
  const t = useTranslations('decision');

  return (
    <Badge data-testid="decision-badge" className={cn(DECISION_STYLES[decision])}>
      {t(decision)}
    </Badge>
  );
}
