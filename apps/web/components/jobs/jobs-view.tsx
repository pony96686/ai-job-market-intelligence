'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { JobDecision, JobApplicationStatusFilter } from '@ai-job-market-intelligence/shared';
import { fetchJobs } from '@/lib/api/jobs';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from '@/i18n/navigation';
import { JobCard } from './job-card';
import { JobListSkeleton } from './job-list-skeleton';
import { JobFilters } from './job-filters';
import { JobSortSelect, type JobSort } from './job-sort-select';
import { ScoringBanner } from '@/components/common/scoring-banner';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';

export function JobsView() {
  const t = useTranslations('jobs');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isScoring = searchParams.get('scoring') === 'true';
  const decision = (searchParams.get('decision') as JobDecision | null) ?? 'ALL';
  const minScore = Number(searchParams.get('minScore') ?? 0);
  const sort = (searchParams.get('sort') as JobSort | null) ?? 'score';
  const applicationStatus =
    (searchParams.get('applicationStatus') as JobApplicationStatusFilter | null) ?? 'ALL';

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'ALL' || value === '0' || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    router.replace(`${pathname}?${next.toString()}`);
  }

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['jobs', { decision, minScore, sort, applicationStatus }],
      queryFn: ({ pageParam }) =>
        fetchJobs({
          page: pageParam,
          decision: decision === 'ALL' ? undefined : decision,
          minScore: minScore || undefined,
          sort,
          applicationStatus: applicationStatus === 'ALL' ? undefined : applicationStatus,
        }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
      refetchInterval: isScoring ? 10_000 : false,
    });

  const jobs = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages.at(-1)?.meta.total ?? 0;

  return (
    <div className="space-y-6">
      {/* -mx-6/-mt-6 cancel out <main>'s p-6 (see (dashboard)/layout.tsx) so
          this spans full-bleed edge-to-edge once stuck, instead of sitting
          inset within the page's normal content padding. */}
      <div className="sticky top-0 z-20 -mx-6 -mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-6 py-4">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <div className="flex flex-wrap items-center gap-4">
          <JobFilters
            decision={decision}
            minScore={minScore}
            applicationStatus={applicationStatus}
            onDecisionChange={(v) => updateParam('decision', v)}
            onMinScoreChange={(v) => updateParam('minScore', String(v))}
            onApplicationStatusChange={(v) => updateParam('applicationStatus', v)}
          />
          <JobSortSelect value={sort} onChange={(v) => updateParam('sort', v)} />
        </div>
      </div>

      {isScoring && <ScoringBanner />}

      {isLoading ? (
        <JobListSkeleton />
      ) : isError ? (
        <ErrorState message={t('failedToLoad')} onRetry={() => refetch()} />
      ) : jobs.length === 0 ? (
        <EmptyState
          title={isScoring ? t('aiAnalyzingTitle') : t('noJobsTitle')}
          description={isScoring ? t('aiAnalyzingDescription') : t('noJobsDescription')}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t('showingCount', { shown: jobs.length, total })}
          </p>
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? tCommon('loading') : t('loadMore')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
