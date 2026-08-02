'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import { fetchLatestCareerBrief } from '@/lib/api/career-agent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function growthBadge(growthPercent: number | null): string {
  if (growthPercent === null) return '';
  const sign = growthPercent >= 0 ? '+' : '';
  return ` (${sign}${growthPercent.toFixed(0)}%)`;
}

export function DailyBriefCard() {
  const t = useTranslations('dashboard');

  const { data: brief, isLoading } = useQuery({
    queryKey: ['career-brief-latest'],
    queryFn: fetchLatestCareerBrief,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('dailyBriefHeading')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !brief ? (
          <>
            <p className="text-sm text-muted-foreground">{t('dailyBriefNoData')}</p>
            <Link
              href="/career-coach"
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              {t('dailyBriefAskCoach')} →
            </Link>
          </>
        ) : (
          <>
            {brief.summary.marketHighlights.topGrowingSkills.length > 0 && (
              <div>
                <p className="text-sm font-medium">{t('dailyBriefGrowingSkills')}</p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {brief.summary.marketHighlights.topGrowingSkills.slice(0, 3).map((s) => (
                    <li key={s.slug}>
                      {s.name} — {t('dailyBriefJobCount', { count: s.jobCount })}
                      {growthBadge(s.growthPercent)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {brief.summary.marketHighlights.hotCompanies.length > 0 && (
              <div>
                <p className="text-sm font-medium">{t('dailyBriefHotCompanies')}</p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {brief.summary.marketHighlights.hotCompanies.slice(0, 3).map((c) => (
                    <li key={c.company}>
                      {c.company} — {t('dailyBriefActiveJobs', { count: c.activeJobCount })}
                      {growthBadge(c.growthPercent)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {brief.summary.recommendedJobs.length > 0 && (
              <div>
                <p className="text-sm font-medium">{t('dailyBriefRecommendedJobs')}</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {brief.summary.recommendedJobs.slice(0, 3).map((j) => (
                    <li key={j.jobId}>
                      <Link href={`/jobs/${j.jobId}`} className="text-primary hover:underline">
                        {j.title}
                      </Link>{' '}
                      <span className="text-muted-foreground">
                        · {j.company} · {j.score}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {brief.summary.recommendedSkill && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t('dailyBriefRecommendedSkill')}:
                </span>{' '}
                {brief.summary.recommendedSkill.name}
              </p>
            )}

            <Link
              href="/career-coach"
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              {t('dailyBriefAskCoach')} →
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
