import { auth } from '@/lib/auth';
import { prisma } from '@ai-job-market-intelligence/db';
import { JobResponseSchema } from '@ai-job-market-intelligence/shared';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { applications: { where: { userId: session.user.id } } },
  });
  if (!job) {
    return apiError('NOT_FOUND', 404, undefined, 'Job not found');
  }
  const application = job.applications[0] ?? null;

  const data = JobResponseSchema.parse({
    id: job.id,
    title: job.title,
    company: job.company,
    description: job.description,
    url: job.url,
    location: job.location,
    tags: job.tags,
    source: job.source,
    role: job.role,
    level: job.level,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    salaryPeriod: job.salaryPeriod,
    remote: job.remote,
    eligibleRegions: job.eligibleRegions,
    parseConfidence: job.parseConfidence,
    status: job.status,
    postedAt: job.postedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    application: application && {
      status: application.status,
      updatedAt: application.updatedAt.toISOString(),
    },
  });

  return apiSuccess(data);
}
