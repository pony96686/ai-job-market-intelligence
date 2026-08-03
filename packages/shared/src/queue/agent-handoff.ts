import { Queue, type JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from '../constants/queues';
import { getQueueConnection } from './connection';

export interface AgentHandoffPayload {
  jobId: string;
  userId: string;
  matchScore: number;
}

export const AGENT_HANDOFF_JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 200 },
};

let agentHandoffQueue: Queue<AgentHandoffPayload> | undefined;

export function getAgentHandoffQueue(): Queue<AgentHandoffPayload> {
  agentHandoffQueue ??= new Queue(QUEUE_NAMES.AGENT_HANDOFF, {
    connection: getQueueConnection(),
  });
  return agentHandoffQueue;
}
