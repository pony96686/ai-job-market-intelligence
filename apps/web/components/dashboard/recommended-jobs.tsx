'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { fetchJobs } from '@/lib/api/jobs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { JobCard } from '@/components/jobs/job-card';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';

const RECOMMENDED_JOBS_LIMIT = 5;

export function RecommendedJobs() {
  const t = useTranslations('dashboard');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['jobs', 'recommended'],
    queryFn: () => fetchJobs({ page: 1, sort: 'score' }),
  });

  const jobs = (data?.data ?? []).slice(0, RECOMMENDED_JOBS_LIMIT);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">{t('recommendedJobsHeading')}</CardTitle>
        <Link href="/jobs" className="text-sm text-muted-foreground hover:underline">
          {t('viewAllJobs')}
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : isError ? (
          <ErrorState message={t('failedToLoad')} onRetry={() => refetch()} />
        ) : jobs.length === 0 ? (
          <EmptyState title={t('noJobsTitle')} description={t('noJobsDescription')} />
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </CardContent>
    </Card>
  );
}
