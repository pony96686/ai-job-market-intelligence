// Manually curated, not runtime-learned — same "human-maintained, no
// learning" philosophy as ingestion/filters.ts's EXCLUDED_TAGS and
// skills/synonyms.ts's SKILL_SYNONYMS. Focused on patterns that are clearly
// an imperative instruction directed at an LLM, not generic AI/LLM
// vocabulary — a real AI/Prompt Engineer job posting can legitimately
// mention "system prompt" or "instructions" without that alone being a
// signal.
export const INJECTION_PATTERNS: RegExp[] = [
  // Direct instruction override
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+the\s+above/i,
  /new\s+instructions\s*:/i,
  /you\s+are\s+now/i,

  // Forged role/delimiter markers
  /system\s*:/i,
  /assistant\s*:/i,
  /###\s*instruction/i,
  /<\|im_start\|>/i,
  /\[inst\]/i,

  // Explicit score/output manipulation
  /(must|always)\s+(respond|reply|rate|score)\s+with/i,
  /give\s+(this\s+candidate|this\s+job)\s+a\s+score\s+of/i,
  // Deliberately no trigger-verb prefix (must/please/be sure to/...) — "mention/
  // include the word X" itself is an unusual enough phrase in a job posting
  // that requiring a specific preceding verb only creates gaps (a real
  // instance used "Please mention the word X", which a "must/make sure to"
  // -only version missed).
  /\b(mention|include)\s+the\s+word\b/i,
];

export function containsInjectionPattern(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}
