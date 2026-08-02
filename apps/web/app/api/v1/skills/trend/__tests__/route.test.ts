import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFindUnique, mockFindMany } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: {
    skill: { findUnique: mockFindUnique },
    skillTrendSnapshot: { findMany: mockFindMany },
  },
}));

import { GET } from '../route';

function makeRequest(query: string) {
  return new Request(`http://localhost/api/v1/skills/trend${query}`);
}

beforeEach(() => {
  mockFindUnique.mockReset();
  mockFindMany.mockReset();
});

describe('GET /api/v1/skills/trend', () => {
  it('returns 400 when the skill query param is missing', async () => {
    const res = await GET(makeRequest('?windowDays=90'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when the skill slug does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await GET(makeRequest('?skill=nonexistent&windowDays=90'));

    expect(res.status).toBe(404);
  });

  it('returns the series oldest-to-newest', async () => {
    mockFindUnique.mockResolvedValue({ id: 'skill_1', slug: 'react', name: 'React' });
    mockFindMany.mockResolvedValue([
      { periodEnd: new Date('2026-08-02T00:00:00Z'), jobCount: 12, growthPercent: 20 },
      { periodEnd: new Date('2026-08-01T00:00:00Z'), jobCount: 10, growthPercent: null },
    ]);

    const res = await GET(makeRequest('?skill=react&windowDays=90'));
    const body = await res.json();

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { skillId: 'skill_1', windowDays: 90 },
      orderBy: { periodEnd: 'desc' },
      take: 180,
    });
    expect(body.data).toEqual({
      slug: 'react',
      name: 'React',
      windowDays: 90,
      series: [
        { periodEnd: '2026-08-01T00:00:00.000Z', jobCount: 10, growthPercent: null },
        { periodEnd: '2026-08-02T00:00:00.000Z', jobCount: 12, growthPercent: 20 },
      ],
    });
  });
});
