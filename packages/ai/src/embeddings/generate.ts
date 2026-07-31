import { getOpenRouterClient } from '../openrouter-client';

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenRouterClient().embeddings.create({
    model: process.env.EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL,
    input: text,
    // The openai SDK defaults to requesting base64 (then decodes it
    // client-side) when this is omitted. OpenRouter's Nvidia embedding model
    // rejects that with "400 ... do not support base64 encoding_format" —
    // explicit 'float' works against both it and real OpenAI.
    encoding_format: 'float',
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding) {
    throw new Error('OpenAI embeddings API returned no data');
  }
  return embedding;
}
