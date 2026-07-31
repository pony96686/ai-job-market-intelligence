export const QUEUE_NAMES = {
  COMPANY_DISCOVERY: 'company_discovery',
  INGESTION_COLLECT: 'ingestion_collect',
  INGESTION_PARSE: 'ingestion_parse',
  SCORING_MATCH: 'scoring_match',
  NOTIFY_EMAIL: 'notify_email',
  PROFILE_PARSE: 'profile_parse',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
