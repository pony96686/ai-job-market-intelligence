const CADENCE_BUCKET_COUNT = 48; // 48 x 30min windows = 24h coverage cycle

// Deterministic slug -> bucket assignment so a company is always checked in
// the same 30min window (rather than reshuffling every run).
export function hashToBucket(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return hash % CADENCE_BUCKET_COUNT;
}

// currentBucket() = current UTC 30min-window index % 48.
export function currentCadenceBucket(date: Date = new Date()): number {
  const minutesSinceEpoch = Math.floor(date.getTime() / (30 * 60 * 1000));
  return minutesSinceEpoch % CADENCE_BUCKET_COUNT;
}
