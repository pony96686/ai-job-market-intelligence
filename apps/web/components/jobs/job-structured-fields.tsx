import { useTranslations } from 'next-intl';
import type { JobResponse } from '@ai-job-market-intelligence/shared';
import { Badge } from '@/components/ui/badge';

// salaryPeriod/salaryCurrency are only ever set by sourceStructured sources
// (Himalayas) — everything else is assumed to already be an annual USD figure.
const PERIOD_TO_ANNUAL_MULTIPLIER: Record<NonNullable<JobResponse['salaryPeriod']>, number> = {
  HOURLY: 2080, // 40h/week * 52 weeks
  MONTHLY: 12,
  ANNUAL: 1,
};

function toAnnual(amount: number, period: JobResponse['salaryPeriod']): number {
  if (!period) return amount;
  return amount * PERIOD_TO_ANNUAL_MULTIPLIER[period];
}

function formatSalary(job: JobResponse): string | null {
  const { salaryMin, salaryMax, salaryCurrency, salaryPeriod } = job;
  if (salaryMin === null && salaryMax === null) return null;

  const currency = salaryCurrency && salaryCurrency !== 'USD' ? ` ${salaryCurrency}` : '';
  const fmt = (n: number) => `${Math.round(toAnnual(n, salaryPeriod) / 1000)}k`;
  const range =
    salaryMin !== null && salaryMax !== null ? `${fmt(salaryMin)}–${fmt(salaryMax)}` : fmt((salaryMin ?? salaryMax)!);
  return `$${range}/yr${currency}`;
}

// /jobs/[id] MUST show the AI Job Parsing structured fields
// (role/level/salary/remote), not just the raw description.
export function JobStructuredFields({ job }: { job: JobResponse }) {
  const t = useTranslations('jobDetail');
  const salary = formatSalary(job);

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="job-structured-fields">
      {job.role && <Badge variant="outline">{job.role}</Badge>}
      {job.level && job.level !== 'Unknown' && <Badge variant="outline">{job.level}</Badge>}
      {salary && <Badge variant="outline">{salary}</Badge>}
      <Badge variant="outline">{job.remote ? t('remoteYes') : t('remoteNo')}</Badge>
    </div>
  );
}
