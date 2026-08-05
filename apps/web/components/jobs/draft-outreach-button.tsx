'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// jobId travels in the URL so CareerCoachView can auto-send a scoped first
// message, instead of expecting the user to describe which job they mean
// in free text.
export function DraftOutreachButton({ jobId }: { jobId: string }) {
  const t = useTranslations('jobDetail');

  return (
    <div className="flex flex-col gap-1">
      <Button asChild variant="outline">
        <Link href={`/career-coach?jobId=${encodeURIComponent(jobId)}`}>
          {t('draftOutreach.button')}
        </Link>
      </Button>
      <p className="text-xs text-muted-foreground">{t('draftOutreach.disclaimer')}</p>
    </div>
  );
}
