// Tracks whether the user has opened /career-coach since the most recent
// agent handoff, purely client-side (no server round-trip needed for what's
// just a "seen it" marker). localStorage persists across reloads; the
// custom event lets the Sidebar's badge react immediately within the same
// session without polling localStorage directly (which isn't reactive).
const STORAGE_KEY = 'agentHandoffLastViewedAt';
const VIEWED_EVENT = 'agent-handoff-viewed';

export function getAgentHandoffLastViewedAt(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function markAgentHandoffsViewed(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  window.dispatchEvent(new Event(VIEWED_EVENT));
}

export function onAgentHandoffsViewed(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(VIEWED_EVENT, callback);
  return () => window.removeEventListener(VIEWED_EVENT, callback);
}
