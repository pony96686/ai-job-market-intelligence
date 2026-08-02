import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: { job: { findMany: mockFindMany } },
}));

import { GET } from '../route';

function makeRequest(query: string) {
  return new Request(`http://localhost/api/v1/skills/heatmap${query}`);
}

beforeEach(() => {
  mockFindMany.mockReset();
});

describe('GET /api/v1/skills/heatmap', () => {
  it('returns 400 when the role query param is missing', async () => {
    const res = await GET(makeRequest(''));
    expect(res.status).toBe(400);
  });

  it('queries ACTIVE jobs with non-empty skills, matching role case-insensitively', async () => {
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('?role=Backend Engineer'));

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        status: 'ACTIVE',
        skills: { isEmpty: false },
        role: { contains: 'Backend Engineer', mode: 'insensitive' },
      },
      select: { skills: true },
    });
  });

  it('discards non-whitelisted skills and dedupes within a single job', async () => {
    mockFindMany.mockResolvedValue([
      { skills: ['js', 'javascript', 'business-development'] }, // js+javascript = same job, same skill
      { skills: ['react'] },
    ]);

    const res = await GET(makeRequest('?role=Frontend Engineer'));
    const body = await res.json();

    expect(body.data.skills).toEqual([
      { slug: 'javascript', name: 'JavaScript', jobCount: 1 },
      { slug: 'react', name: 'React', jobCount: 1 },
    ]);
  });

  it('sorts by jobCount descending', async () => {
    mockFindMany.mockResolvedValue([
      { skills: ['react'] },
      { skills: ['react'] },
      { skills: ['vue'] },
    ]);

    const res = await GET(makeRequest('?role=Frontend Engineer'));
    const body = await res.json();

    expect(body.data.skills[0]).toEqual({ slug: 'react', name: 'React', jobCount: 2 });
    expect(body.data.skills[1]).toEqual({ slug: 'vue', name: 'Vue', jobCount: 1 });
  });
});
