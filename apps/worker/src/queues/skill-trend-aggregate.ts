import {
  getSkillTrendAggregateQueue,
  SKILL_TREND_AGGREGATE_JOB_OPTS,
} from '@ai-job-market-intelligence/shared/queue';

// 01:00 UTC — ahead of career_agent_daily (01:30 UTC) which reads this
// data, and clear of the existing ingestion cron windows (Himalayas 03:00
// UTC, company_discovery Monday 04:00 UTC), see v2-scope.md §2 decision #5.
const DAILY_1AM_UTC = '0 1 * * *';

export async function scheduleSkillTrendAggregateCron(): Promise<void> {
  const queue = getSkillTrendAggregateQueue();

  await queue.add(
    'aggregate',
    {},
    {
      ...SKILL_TREND_AGGREGATE_JOB_OPTS,
      jobId: 'skill-trend-aggregate-cron',
      repeat: { pattern: DAILY_1AM_UTC, immediately: false },
    },
  );
}
