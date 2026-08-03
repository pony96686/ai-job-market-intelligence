import { prisma } from '@ai-job-market-intelligence/db';
import {
  getAgentHandoffQueue,
  AGENT_HANDOFF_JOB_OPTS,
} from '@ai-job-market-intelligence/shared/queue';

// Dev-only: manually enqueues an agent_handoff for a specific user + job,
// without waiting for a real >=90 score to occur naturally — that threshold
// is set deliberately high, so real/local data may take a long time to
// cross it on its own, which makes recording a reliable Demo impractical.
// This only enqueues the job; the worker's normal running process picks it
// up and processes it exactly like a real handoff (writes AgentHandoff +
// the Career Coach opener message).
// Run with:
//   $env:EMAIL = "you@example.com"
//   $env:JOB_ID = "<a real job id from your jobs table>"
//   pnpm --filter @ai-job-market-intelligence/worker exec tsx --env-file=.env scripts/trigger-agent-handoff.ts

const DEMO_MATCH_SCORE = 94;

async function main() {
  const email = process.env.EMAIL;
  const jobId = process.env.JOB_ID;
  if (!email) throw new Error('Set EMAIL=<user email> before running this script.');
  if (!jobId) throw new Error('Set JOB_ID=<a job id> before running this script.');

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.job.findUniqueOrThrow({ where: { id: jobId } }); // fail fast on a bad id

  await getAgentHandoffQueue().add(
    'handoff',
    { jobId, userId: user.id, matchScore: DEMO_MATCH_SCORE },
    { ...AGENT_HANDOFF_JOB_OPTS, jobId: `handoff:${jobId}:${user.id}` },
  );

  console.log(
    `Enqueued a demo agent_handoff for ${email} on job ${jobId}. ` +
      'Make sure the worker process is running to see it get processed.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
