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
              eligibleRegions: ['US'],
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
    expect(result.eligibleRegions).toEqual(['US']);
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
    expect(result.eligibleRegions).toEqual([]);
  });

  // Unconfigured CHAT_MODEL_FALLBACK must behave exactly like
  // before — no fallback attempt, still 2 calls, still
  // confidence=0.
  it('does not attempt a fallback model when CHAT_MODEL_FALLBACK is unset', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'not json' } }] });

    await parseJobFields({ title: 'Backend Engineer', description: 'desc', tags: [] });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'google/gemma-4-26b-a4b-it:free' }),
    );
  });

  it('uses CHAT_MODEL_FALLBACK once the free model is exhausted, when configured', async () => {
    process.env.CHAT_MODEL_FALLBACK = 'paid-model';
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { limit_remaining: 5 } }),
    }) as unknown as typeof fetch;

    mockCreate
      .mockRejectedValueOnce(new Error('down'))
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                role: 'Backend Engineer',
                level: 'Senior',
                skills: ['node.js'],
                salaryMin: null,
                salaryMax: null,
                remote: true,
                eligibleRegions: [],
                confidence: 0.8,
              }),
            },
          },
        ],
      });

    try {
      const result = await parseJobFields({
        title: 'Backend Engineer',
        description: 'desc',
        tags: [],
      });

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockCreate).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ model: 'paid-model' }),
      );
      expect(result.confidence).toBe(0.8);
    } finally {
      delete process.env.CHAT_MODEL_FALLBACK;
      global.fetch = originalFetch;
    }
  });
});
