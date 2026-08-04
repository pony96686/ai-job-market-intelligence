import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUpsertUsageDaily } = vi.hoisted(() => ({
  mockUpsertUsageDaily: vi.fn(),
}));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: {
    usageDaily: { upsert: mockUpsertUsageDaily },
  },
}));

import { incrementUsage } from '../usage';

beforeEach(() => {
  mockUpsertUsageDaily.mockReset();
});

describe('incrementUsage', () => {
  it('upserts rather than assuming a row already exists', async () => {
    // canScore() only creates a UsageDaily row for FREE-plan users (it
    // returns early for PRO/ACTIVE before ever touching the table), so a
    // PRO user's first scored job of the day has no row for incrementUsage
    // to update — this must create it instead of throwing P2025.
    await incrementUsage('user-1');

    expect(mockUpsertUsageDaily).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_date: { userId: 'user-1', date: expect.any(Date) } },
        create: expect.objectContaining({ userId: 'user-1', scoreCount: 1 }),
        update: { scoreCount: { increment: 1 } },
      }),
    );
  });
});
