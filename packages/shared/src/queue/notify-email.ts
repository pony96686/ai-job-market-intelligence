import { Queue, type JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from '../constants/queues';
import { getQueueConnection } from './connection';

export interface NotifyEmailPayload {
  jobId: string;
  userId: string;
}

export const NOTIFY_EMAIL_JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'fixed', delay: 10000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 100 },
};

let notifyEmailQueue: Queue<NotifyEmailPayload> | undefined;

export function getNotifyEmailQueue(): Queue<NotifyEmailPayload> {
  notifyEmailQueue ??= new Queue(QUEUE_NAMES.NOTIFY_EMAIL, { connection: getQueueConnection() });
  return notifyEmailQueue;
}
