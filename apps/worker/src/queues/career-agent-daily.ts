import {
  getCareerAgentDailyQueue,
  CAREER_AGENT_DAILY_JOB_OPTS,
} from '@ai-job-market-intelligence/shared/queue';

// 01:30 UTC — 30 minutes after skill_trend_aggregate (01:00 UTC), which this
// job's data depends on.
const DAILY_130AM_UTC = '30 1 * * *';

export async function scheduleCareerAgentDailyCron(): Promise<void> {
  const queue = getCareerAgentDailyQueue();

  await queue.add(
    'daily',
    {},
    {
      ...CAREER_AGENT_DAILY_JOB_OPTS,
      jobId: 'career-agent-daily-cron',
      repeat: { pattern: DAILY_130AM_UTC, immediately: false },
    },
  );
}
