export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function computeEmbeddingScore(profileEmbedding: number[], jobEmbedding: number[]): number {
  const similarity = cosineSimilarity(profileEmbedding, jobEmbedding); // range -1 to 1
  // Map to 0-100: similarity typically falls between 0.3 and 0.9
  const normalized = Math.max(0, Math.min(100, ((similarity - 0.3) / 0.6) * 100));
  return Math.round(normalized);
}
