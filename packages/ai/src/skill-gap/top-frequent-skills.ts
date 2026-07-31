// Statistics only, no LLM call — takes the tag lists of the target role's
// most similar jobs and returns the most common skills.
export function topFrequentSkills(tagLists: string[][], limit: number): string[] {
  const counts = new Map<string, number>();

  for (const tags of tagLists) {
    for (const tag of tags) {
      const key = tag.toLowerCase().trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}
