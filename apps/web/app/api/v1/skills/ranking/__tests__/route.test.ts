import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFindFirst, mockFindMany } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: { skillTrendSnapshot: { findFirst: mockFindFirst, findMany: mockFindMany } },
}));

import { GET } from '../route';

function makeRequest(query: string) {
  return new Request(`http://localhost/api/v1/skills/ranking${query}`);
}

beforeEach(() => {
  mockFindFirst.mockReset();
  mockFindMany.mockReset();
});

describe('GET /api/v1/skills/ranking', () => {
  it('returns 400 on an invalid windowDays value', async () => {
    const res = await GET(makeRequest('?windowDays=45'));
    expect(res.status).toBe(400);
  });

  it('returns an empty list when no snapshot has ever been written for this window', async () => {
    mockFindFirst.mockResolvedValue(null);

    const res = await GET(makeRequest('?windowDays=90'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('defaults to sort=count, ordering by jobCount descending', async () => {
    mockFindFirst.mockResolvedValue({ periodEnd: new Date('2026-08-02T00:00:00Z') });
    mockFindMany.mockResolvedValue([
      { jobCount: 10, growthPercent: null, skill: { slug: 'react', name: 'React' } },
    ]);

    const res = await GET(makeRequest('?windowDays=90'));
    const body = await res.json();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { windowDays: 90, periodEnd: new Date('2026-08-02T00:00:00Z') },
        orderBy: { jobCount: 'desc' },
      }),
    );
    expect(body.data).toEqual([
      { slug: 'react', name: 'React', jobCount: 10, growthPercent: null },
    ]);
  });

  it('filters out null-growthPercent skills and sorts descending for sort=growing', async () => {
    mockFindFirst.mockResolvedValue({ periodEnd: new Date('2026-08-02T00:00:00Z') });
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('?windowDays=90&sort=growing'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          windowDays: 90,
          periodEnd: new Date('2026-08-02T00:00:00Z'),
          growthPercent: { not: null },
        },
        orderBy: { growthPercent: 'desc' },
      }),
    );
  });

  it('sorts ascending for sort=declining', async () => {
    mockFindFirst.mockResolvedValue({ periodEnd: new Date('2026-08-02T00:00:00Z') });
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('?windowDays=90&sort=declining'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { growthPercent: 'asc' } }),
    );
  });
});
