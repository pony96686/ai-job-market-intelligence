import { Suspense } from 'react';
import { JobsView } from '@/components/jobs/jobs-view';
import { JobListSkeleton } from '@/components/jobs/job-list-skeleton';

export default function JobsPage() {
  return (
    <Suspense fallback={<JobListSkeleton />}>
      <JobsView />
    </Suspense>
  );
}
