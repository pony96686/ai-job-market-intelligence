import type { Job } from 'bullmq';
import { Resend } from 'resend';
import { prisma } from '@ai-job-market-intelligence/db';
import type { NotifyEmailPayload } from '@ai-job-market-intelligence/shared/queue';
import { renderMatchEmail } from '../notifications/render-match-email.js';
import { logger } from '../logger.js';

let resendClient: Resend | undefined;

function getResendClient(): Resend {
  resendClient ??= new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

export async function processNotifyEmail(job: Job<NotifyEmailPayload>): Promise<void> {
  const { jobId, userId } = job.data;
  const traceId = job.id!;

  // 1. Dedup check (DB unique constraint is the backstop)
  const existing = await prisma.notification.findUnique({
    where: { userId_jobId_channel: { userId, jobId, channel: 'EMAIL' } },
  });
  if (existing?.status === 'SENT') {
    logger.info({ event: 'notify_skip_already_sent', jobId, userId, traceId });
    return;
  }

  // 2. Load data
  const [user, jobRecord, score] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.job.findUniqueOrThrow({ where: { id: jobId } }),
    prisma.jobScore.findUniqueOrThrow({ where: { jobId_userId: { jobId, userId } } }),
  ]);

  // 3. Create the notification record
  const notification = await prisma.notification.upsert({
    where: { userId_jobId_channel: { userId, jobId, channel: 'EMAIL' } },
    create: { userId, jobId, channel: 'EMAIL', status: 'PENDING' },
    update: {},
  });

  // 4. Send the email
  // Note: Resend SDK's emails.send() does not throw on API errors — it
  // returns { data: null, error } instead, so the error field must be checked
  // explicitly and thrown manually, otherwise a failure would be
  // misinterpreted as a successful send.
  try {
    const { error } = await getResendClient().emails.send({
      from: process.env.EMAIL_FROM!,
      to: user.email,
      subject: `🎯 ${score.score}% match: ${jobRecord.title} at ${jobRecord.company}`,
      html: renderMatchEmail({ job: jobRecord, score, appUrl: process.env.NEXT_PUBLIC_APP_URL! }),
    });
    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'SENT', sentAt: new Date() },
    });

    logger.info({ event: 'notify_email_complete', jobId, userId, traceId });
  } catch (error) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'FAILED' },
    });
    logger.error({
      event: 'notify_email_error',
      jobId,
      userId,
      traceId,
      error: (error as Error).message,
    });
    throw error; // BullMQ retries
  }
}
