import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockFindFirst } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindFirst: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: { careerBrief: { findFirst: mockFindFirst } },
}));

import { GET } from '../route';

const summary = {
  marketHighlights: {
    topGrowingSkills: [{ slug: 'rust', name: 'Rust', jobCount: 20, growthPercent: 50 }],
    hotCompanies: [{ company: 'Acme', activeJobCount: 10, growthPercent: null }],
  },
  recommendedJobs: [{ jobId: 'job-1', title: 'Backend Engineer', company: 'Acme', score: 90 }],
  recommendedSkill: { slug: 'rust', name: 'Rust', jobCount: 20, growthPercent: 50 },
};

beforeEach(() => {
  mockAuth.mockReset();
  mockFindFirst.mockReset();
});

describe('GET /api/v1/career-agent/briefs/latest', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it('returns 404 when the user has no brief yet', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindFirst.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(404);
  });

  it('returns the most recent brief for the user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindFirst.mockResolvedValue({
      userId: 'user-1',
      briefDate: new Date('2026-08-02T00:00:00Z'),
      summary,
    });

    const res = await GET();
    const body = await res.json();

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' }, orderBy: { briefDate: 'desc' } }),
    );
    expect(body.data).toEqual({ briefDate: '2026-08-02', summary });
  });
});
