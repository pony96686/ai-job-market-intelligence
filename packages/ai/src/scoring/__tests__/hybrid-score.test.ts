import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

import { scoreJob } from '../hybrid-score';

const profile = {
  skills: ['Node.js', 'TypeScript'],
  experienceYears: 6,
  preferredRoles: ['Backend Engineer'],
};
const job = {
  title: 'Senior Backend Engineer',
  company: 'Acme',
  tags: ['node', 'typescript'],
  description: 'We need someone strong in Node.js and TypeScript.',
};

const similarEmbedding = new Array(1536).fill(1);
const lowA = new Array(1536).fill(0).map((_, i) => (i === 0 ? 1 : 0));
const lowB = new Array(1536).fill(0).map((_, i) => (i === 1 ? 1 : 0));

beforeEach(() => {
  mockCreate.mockReset();
});

describe('scoreJob', () => {
  it('skips the LLM call when embedding and rule scores are both low', async () => {
    const lowProfile = { skills: [], experienceYears: 100, preferredRoles: [] };
    const result = await scoreJob(lowProfile, job, { profile: lowA, job: lowB });

    expect(result.decision).toBe('SKIP');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('computes the weighted score using the LLM result when scores are high enough', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              score: 85,
              reasoning: 'Strong match on Node.js and TypeScript skills.',
              strengths: ['Strong Node.js experience', 'TypeScript expertise'],
              skill_gap: ['Kubernetes'],
            }),
          },
        },
      ],
    });

    const result = await scoreJob(profile, job, { profile: similarEmbedding, job: similarEmbedding });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result.llmScore).toBe(85);
    expect(result.strengths).toEqual(['Strong Node.js experience', 'TypeScript expertise']);
    expect(result.skillGap).toEqual(['Kubernetes']);
    expect(result.score).toBe(
      Math.round(0.4 * 85 + 0.4 * result.embeddingScore + 0.2 * result.ruleScore),
    );
  });

  it('falls back to the rule score when the LLM fails twice', async () => {
    mockCreate.mockRejectedValue(new Error('API error'));

    const result = await scoreJob(profile, job, { profile: similarEmbedding, job: similarEmbedding });

    expect(mockCreate).toHaveBeenCalledTimes(2); // initial attempt + 1 retry
    expect(result.reasoning).toContain('temporarily unavailable');
    expect(result.llmScore).toBe(result.ruleScore);
    expect(result.strengths).toEqual([]);
    expect(result.skillGap).toEqual([]);
  });
});
