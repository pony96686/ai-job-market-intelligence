import { useTranslations } from 'next-intl';
import type { ApplicationStatus } from '@ai-job-market-intelligence/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const APPLICATION_STYLES: Record<ApplicationStatus, string> = {
  APPLIED: 'bg-blue-100 text-blue-800',
  INTERVIEWING: 'bg-purple-100 text-purple-800',
  OFFER: 'bg-green-100 text-green-800',
  REJECTED: 'bg-gray-100 text-gray-500',
  WITHDRAWN: 'bg-gray-100 text-gray-500',
};

export function ApplicationBadge({ status }: { status: ApplicationStatus }) {
  const t = useTranslations('jobs.applicationStatus');

  return (
    <Badge data-testid="application-badge" className={cn(APPLICATION_STYLES[status])}>
      {t(status)}
    </Badge>
  );
}
