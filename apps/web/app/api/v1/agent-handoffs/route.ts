import { auth } from '@/lib/auth';
import { prisma } from '@ai-job-market-intelligence/db';
import { AgentHandoffQuerySchema, AgentHandoffSchema } from '@ai-job-market-intelligence/shared';
import { apiSuccess, apiError } from '@/lib/api-response';

interface HandoffContext {
  jobId: string;
  matchScore: number;
  reason: string;
}

function isHandoffContext(value: unknown): value is HandoffContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as HandoffContext).jobId === 'string' &&
    typeof (value as HandoffContext).matchScore === 'number' &&
    typeof (value as HandoffContext).reason === 'string'
  );
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const { searchParams } = new URL(request.url);
  const parsed = AgentHandoffQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 400, parsed.error.issues);
  }

  const handoffs = await prisma.agentHandoff.findMany({
    where: { userId: session.user.id },
    orderBy: { triggeredAt: 'desc' },
    take: parsed.data.limit,
  });

  const validHandoffs = handoffs
    .map((h) => (isHandoffContext(h.context) ? { ...h, context: h.context } : null))
    .filter((h): h is NonNullable<typeof h> => h !== null);

  const jobs = await prisma.job.findMany({
    where: { id: { in: validHandoffs.map((h) => h.context.jobId) } },
    select: { id: true, title: true, company: true },
  });
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  const data = validHandoffs
    .map((h) => {
      const job = jobById.get(h.context.jobId);
      // The job itself may have since been deleted (see the ingestion-time
      // data-quality fixes) — skip rendering a handoff that points at
      // nothing rather than showing a broken timeline entry.
      if (!job) return null;

      return AgentHandoffSchema.parse({
        id: h.id,
        fromAgent: h.fromAgent,
        toAgent: h.toAgent,
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        matchScore: h.context.matchScore,
        reason: h.context.reason,
        triggeredAt: h.triggeredAt.toISOString(),
        consumedAt: h.consumedAt?.toISOString() ?? null,
      });
    })
    .filter((h) => h !== null);

  return apiSuccess(data);
}
