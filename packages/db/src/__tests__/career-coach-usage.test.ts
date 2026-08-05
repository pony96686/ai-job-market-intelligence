import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import { canSendCareerCoachMessage, incrementCareerCoachUsage } from '../career-coach-usage';

// Integration test against a real Postgres.
const TEST_PREFIX = 'test-career-coach-usage-';

async function createTestUser(emailSuffix: string) {
  return prisma.user.create({ data: { email: `${TEST_PREFIX}${emailSuffix}@example.com` } });
}

afterAll(async () => {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  await prisma.usageDaily.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } });
  await prisma.$disconnect();
});

describe('canSendCareerCoachMessage / incrementCareerCoachUsage', () => {
  it('allows a FREE-plan (no subscription row) user under the 10/day limit', async () => {
    const user = await createTestUser('free-under-limit');

    expect(await canSendCareerCoachMessage(user.id)).toBe(true);
  });

  it('blocks a FREE-plan user once they hit the 10/day limit', async () => {
    const user = await createTestUser('free-over-limit');

    for (let i = 0; i < 10; i++) {
      await incrementCareerCoachUsage(user.id);
    }

    expect(await canSendCareerCoachMessage(user.id)).toBe(false);
  });

  it('gives a PRO+ACTIVE user a 30/day limit instead of 10', async () => {
    const user = await createTestUser('pro-30-limit');
    await prisma.subscription.create({ data: { userId: user.id, plan: 'PRO', status: 'ACTIVE' } });

    for (let i = 0; i < 15; i++) {
      await incrementCareerCoachUsage(user.id);
    }

    expect(await canSendCareerCoachMessage(user.id)).toBe(true);
  });

  it('does not let a PRO+ACTIVE user exceed 30/day either', async () => {
    const user = await createTestUser('pro-over-limit');
    await prisma.subscription.create({ data: { userId: user.id, plan: 'PRO', status: 'ACTIVE' } });

    for (let i = 0; i < 30; i++) {
      await incrementCareerCoachUsage(user.id);
    }

    expect(await canSendCareerCoachMessage(user.id)).toBe(false);
  });

  it('treats a PRO plan with a non-ACTIVE status as FREE (10/day)', async () => {
    const user = await createTestUser('pro-inactive');
    await prisma.subscription.create({
      data: { userId: user.id, plan: 'PRO', status: 'PAST_DUE' },
    });

    for (let i = 0; i < 10; i++) {
      await incrementCareerCoachUsage(user.id);
    }

    expect(await canSendCareerCoachMessage(user.id)).toBe(false);
  });

  it('increments the same day-bucketed row rather than creating a new one each time', async () => {
    const user = await createTestUser('increment-same-row');

    await incrementCareerCoachUsage(user.id);
    await incrementCareerCoachUsage(user.id);
    await incrementCareerCoachUsage(user.id);

    const rows = await prisma.usageDaily.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.careerCoachMessageCount).toBe(3);
  });
});
