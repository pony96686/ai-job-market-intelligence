'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ApplicationStatus,
  JobApplicationDto,
  JobApplicationSummary,
  JobResponse,
} from '@ai-job-market-intelligence/shared';
import { updateJobApplication, deleteJobApplication } from '@/lib/api/jobs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';

const NONE_VALUE = 'NONE';
type SelectValue = ApplicationStatus | typeof NONE_VALUE;
interface MutationContext {
  previous: JobResponse | undefined;
}

export function ApplicationStatusSelect({
  jobId,
  application,
}: {
  jobId: string;
  application: JobApplicationSummary | null;
}) {
  const t = useTranslations('jobDetail.application');
  const queryClient = useQueryClient();
  const toast = useToast();
  const queryKey = ['jobs', jobId];
  const value: SelectValue = application?.status ?? NONE_VALUE;

  const mutation = useMutation<JobApplicationDto | null, Error, SelectValue, MutationContext>({
    mutationFn: (next) =>
      next === NONE_VALUE
        ? deleteJobApplication(jobId).then(() => null)
        : updateJobApplication(jobId, next),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<JobResponse>(queryKey);
      queryClient.setQueryData<JobResponse | undefined>(queryKey, (old) =>
        old
          ? {
              ...old,
              application:
                next === NONE_VALUE ? null : { status: next, updatedAt: new Date().toISOString() },
            }
          : old,
      );
      return { previous };
    },
    onError: (_error, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast(t('updateFailed'), 'destructive');
    },
    onSuccess: () => {
      toast(t('updateSucceeded'), 'success');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <Select value={value} onValueChange={(v) => mutation.mutate(v as SelectValue)}>
      <SelectTrigger className="w-44" aria-label={t('label')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>{t('none')}</SelectItem>
        <SelectItem value="APPLIED">{t('APPLIED')}</SelectItem>
        <SelectItem value="INTERVIEWING">{t('INTERVIEWING')}</SelectItem>
        <SelectItem value="OFFER">{t('OFFER')}</SelectItem>
        <SelectItem value="REJECTED">{t('REJECTED')}</SelectItem>
        <SelectItem value="WITHDRAWN">{t('WITHDRAWN')}</SelectItem>
      </SelectContent>
    </Select>
  );
}
