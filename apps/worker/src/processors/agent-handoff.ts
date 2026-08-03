import type { Job } from 'bullmq';
import { prisma, createCareerCoachToolExecutor } from '@ai-job-market-intelligence/db';
import { runCareerCoachTurn, type CareerCoachMessage } from '@ai-job-market-intelligence/ai';
import { CAREER_COACH_HISTORY_CONTEXT_LIMIT } from '@ai-job-market-intelligence/shared/constants';
import type { AgentHandoffPayload } from '@ai-job-market-intelligence/shared/queue';
import { logger } from '../logger.js';

function buildOpenerPrompt(jobTitle: string, company: string, matchScore: number): string {
  return (
    `A new high-match job opportunity was just found for you (match score: ${matchScore}/100): ` +
    `"${jobTitle}" at ${company}. Proactively write a short, friendly opening message about this ` +
    'opportunity — mention the role, company, and score, and invite the user to ask more (e.g. ' +
    'about career paths, skill gaps, or salary expectations). Do not wait for the user to ask first.'
  );
}

export async function processAgentHandoff(job: Job<AgentHandoffPayload>): Promise<void> {
  const { jobId, userId, matchScore } = job.data;
  const traceId = job.id!;

  // Same job may cross the >=90 threshold again later (e.g. rescored after a
  // profile update) — a handoff that already ran to completion must not
  // repeat, but one that's still pending (a prior attempt created the row
  // then failed before generating the opener) should resume, not be skipped.
  const existing = await prisma.agentHandoff.findFirst({
    where: { userId, context: { path: ['jobId'], equals: jobId } },
  });
  if (existing?.consumedAt) {
    logger.info({ event: 'agent_handoff_already_consumed', jobId, userId, traceId });
    return;
  }

  const jobRecord = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });

  const handoff =
    existing ??
    (await prisma.agentHandoff.create({
      data: {
        userId,
        fromAgent: 'OPPORTUNITY_DISCOVERY',
        toAgent: 'CAREER_COACH',
        context: { jobId, matchScore, reason: `score >= 90 threshold (${matchScore})` },
      },
    }));

  const recentMessages = await prisma.careerCoachMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: CAREER_COACH_HISTORY_CONTEXT_LIMIT,
  });
  const history: CareerCoachMessage[] = recentMessages
    .reverse()
    .map((m) => ({ role: m.role === 'USER' ? 'user' : 'assistant', content: m.content }));
  history.push({
    role: 'user',
    content: buildOpenerPrompt(jobRecord.title, jobRecord.company, matchScore),
  });

  const answer = await runCareerCoachTurn(history, createCareerCoachToolExecutor(userId));

  await prisma.careerCoachMessage.create({
    data: { userId, role: 'ASSISTANT', content: answer },
  });

  await prisma.agentHandoff.update({
    where: { id: handoff.id },
    data: { consumedAt: new Date() },
  });

  logger.info({ event: 'agent_handoff_complete', jobId, userId, matchScore, traceId });
}
