import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@ai-job-market-intelligence/db';
import {
  UpdateJobApplicationSchema,
  JobApplicationSchema,
} from '@ai-job-market-intelligence/shared';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = UpdateJobApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 400, parsed.error.issues);
  }

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    return apiError('NOT_FOUND', 404, undefined, 'Job not found');
  }

  const { status, note } = parsed.data;
  const application = await prisma.jobApplication.upsert({
    where: { jobId_userId: { jobId: id, userId: session.user.id } },
    create: { jobId: id, userId: session.user.id, status, note },
    update: { status, note },
  });

  const data = JobApplicationSchema.parse({
    jobId: application.jobId,
    status: application.status,
    note: application.note,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  });

  return apiSuccess(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const { id } = await params;
  // Idempotent: no record to delete is not an error.
  await prisma.jobApplication.deleteMany({
    where: { jobId: id, userId: session.user.id },
  });

  return new NextResponse(null, { status: 204 });
}
