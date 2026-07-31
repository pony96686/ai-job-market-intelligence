import { Redis } from 'ioredis';

let connection: Redis | undefined;

// BullMQ requires maxRetriesPerRequest: null, which is why this is kept
// separate from the ioredis instance in apps/web/lib/redis.ts used for health
// checks — the two serve different purposes and must not share config.
export function getQueueConnection(): Redis {
  connection ??= new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  return connection;
}
