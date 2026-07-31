import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockFindMany } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: { order: { findMany: mockFindMany } },
}));

import { GET } from '../route';

beforeEach(() => {
  mockAuth.mockReset();
  mockFindMany.mockReset();
});

describe('GET /api/v1/billing/orders', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('returns the user\'s orders newest-first', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user_1' } });
    mockFindMany.mockResolvedValue([
      {
        id: 'order_1',
        amount: 1900,
        currency: 'usd',
        status: 'PAID',
        description: 'Pro plan',
        invoiceUrl: 'https://invoice.stripe.com/i/in_1',
        createdAt: new Date('2026-07-31T00:00:00Z'),
      },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(body.data).toEqual([
      {
        id: 'order_1',
        amount: 1900,
        currency: 'usd',
        status: 'PAID',
        description: 'Pro plan',
        invoiceUrl: 'https://invoice.stripe.com/i/in_1',
        createdAt: '2026-07-31T00:00:00.000Z',
      },
    ]);
  });
});
