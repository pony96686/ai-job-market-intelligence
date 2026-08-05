'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { fetchJob, fetchJobScore } from '@/lib/api/jobs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/error-state';
import { Link } from '@/i18n/navigation';
import { ScoreAnalysis } from './score-analysis';
import { JobDescription } from './job-description';
import { JobStructuredFields } from './job-structured-fields';
import { SourceAttribution } from './source-attribution';
import { ApplicationStatusSelect } from './application-status-select';
import { DraftOutreachButton } from './draft-outreach-button';

function BackLink() {
  const t = useTranslations('jobDetail');
  return (
    <Link
      href="/jobs"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {t('backToJobs')}
    </Link>
  );
}

export function JobDetailView({ jobId }: { jobId: string }) {
  const t = useTranslations('jobDetail');
  const jobQuery = useQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => fetchJob(jobId),
    retry: false,
  });

  const scoreQuery = useQuery({
    queryKey: ['jobs', jobId, 'score'],
    queryFn: () => fetchJobScore(jobId),
    refetchInterval: (query) => (query.state.data === null ? 5_000 : false),
  });

  if (jobQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (jobQuery.isError || !jobQuery.data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorState message={t('notFound')} />
      </div>
    );
  }

  const job = jobQuery.data;

  return (
    <div className="space-y-6">
      <BackLink />
      <div>
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        <p className="text-muted-foreground">
          {job.company} · 🌍 {job.location}
          {job.postedAt &&
            ` · ${t('postedOn', { date: new Date(job.postedAt).toLocaleDateString() })}`}
        </p>
        <SourceAttribution source={job.source} />
      </div>

      <JobStructuredFields job={job} />

      <ScoreAnalysis score={scoreQuery.data} isLoading={scoreQuery.isLoading} />

      <JobDescription description={job.description} />

      <div className="flex flex-wrap items-start gap-4">
        <Button asChild>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('applyAriaLabel')}
          >
            {t('applyOnSource')}
          </a>
        </Button>
        <ApplicationStatusSelect jobId={job.id} application={job.application} />
        <DraftOutreachButton jobId={job.id} />
      </div>
    </div>
  );
}
