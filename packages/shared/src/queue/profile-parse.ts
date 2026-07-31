import { Queue, type JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from '../constants/queues';
import { getQueueConnection } from './connection';

export type ProfileParsePayload =
  | { userId: string; source: 'resume'; resumeText: string }
  | { userId: string; source: 'github'; githubUsername: string };

export const PROFILE_PARSE_JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 100 },
};

let profileParseQueue: Queue<ProfileParsePayload> | undefined;

export function getProfileParseQueue(): Queue<ProfileParsePayload> {
  profileParseQueue ??= new Queue(QUEUE_NAMES.PROFILE_PARSE, {
    connection: getQueueConnection(),
  });
  return profileParseQueue;
}

// jobId dedupes on userId+source so re-uploading a resume or re-linking
// GitHub before the previous parse finishes replaces the queued job rather
// than piling up duplicate parses for the same user.
export async function enqueueProfileParse(payload: ProfileParsePayload): Promise<void> {
  const queue = getProfileParseQueue();
  await queue.add('parse', payload, {
    ...PROFILE_PARSE_JOB_OPTS,
    jobId: `profile-parse:${payload.userId}:${payload.source}`,
  });
}
