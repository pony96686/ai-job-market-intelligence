import { NextResponse } from 'next/server';
import { prisma } from '@ai-job-market-intelligence/db';
import { withTimeout } from '@ai-job-market-intelligence/shared';
import { redis } from '@/lib/redis';

const HEALTH_CHECK_TIMEOUT_MS = 3000;

export async function GET() {
  const services = {
    database: 'ok' as 'ok' | 'error',
    redis: 'ok' as 'ok' | 'error',
  };

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, HEALTH_CHECK_TIMEOUT_MS);
  } catch {
    services.database = 'error';
  }

  try {
    await withTimeout(redis.ping(), HEALTH_CHECK_TIMEOUT_MS);
  } catch {
    services.redis = 'error';
  }

  const status = services.database === 'ok' && services.redis === 'ok' ? 'ok' : 'degraded';

  return NextResponse.json(
    {
      data: {
        status,
        timestamp: new Date().toISOString(),
        services,
      },
    },
    { status: status === 'ok' ? 200 : 503 },
  );
}
