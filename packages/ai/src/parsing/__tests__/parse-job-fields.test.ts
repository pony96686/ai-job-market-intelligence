import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

import { parseJobFields } from '../parse-job-fields';

beforeEach(() => {
  mockCreate.mockReset();
});

describe('parseJobFields', () => {
  it('parses a valid LLM JSON response into ParsedJobFields', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              role: 'Backend Engineer',
              level: 'Senior',
              skills: ['node.js', 'typescript'],
              salaryMin: 120_000,
              salaryMax: 160_000,
              remote: true,
              confidence: 0.9,
            }),
          },
        },
      ],
    });

    const result = await parseJobFields({
      title: 'Senior Backend Engineer',
      description: 'Build our Node.js platform.',
      tags: ['node'],
    });

    expect(result.role).toBe('Backend Engineer');
    expect(result.level).toBe('Senior');
    expect(result.skills).toEqual(['node.js', 'typescript']);
    expect(result.confidence).toBe(0.9);
  });

  it('falls back to a confidence=0 result after two failed attempts instead of throwing', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'not json' } }] });

    const result = await parseJobFields({
      title: 'Backend Engineer',
      description: 'Some job description text here.',
      tags: [],
    });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.confidence).toBe(0);
    expect(result.role).toBe('');
    expect(result.skills).toEqual([]);
  });
});
