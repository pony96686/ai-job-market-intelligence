import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: { create: mockCreate },
  })),
}));

import { generateEmbedding } from '../generate';

beforeEach(() => {
  mockCreate.mockReset();
  mockCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2, 0.3] }] });
});

describe('generateEmbedding', () => {
  it('explicitly requests encoding_format=float (not the SDK default base64)', async () => {
    // OpenRouter's Nvidia embedding model 400s on the openai SDK's default
    // base64 encoding_format — this must always be overridden to 'float'.
    await generateEmbedding('some text');

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ encoding_format: 'float' }));
  });

  it('returns the embedding vector from the response', async () => {
    const result = await generateEmbedding('some text');
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it('throws when the API returns no embedding data', async () => {
    mockCreate.mockResolvedValue({ data: [] });
    await expect(generateEmbedding('some text')).rejects.toThrow('OpenAI embeddings API returned no data');
  });
});
