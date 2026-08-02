import { Queue, type JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from '../constants/queues';
import { getQueueConnection } from './connection';

export interface CareerBriefGeneratePayload {
  userId: string;
}

export const CAREER_BRIEF_GENERATE_JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 200 },
};

let careerBriefGenerateQueue: Queue<CareerBriefGeneratePayload> | undefined;

export function getCareerBriefGenerateQueue(): Queue<CareerBriefGeneratePayload> {
  careerBriefGenerateQueue ??= new Queue(QUEUE_NAMES.CAREER_BRIEF_GENERATE, {
    connection: getQueueConnection(),
  });
  return careerBriefGenerateQueue;
}
