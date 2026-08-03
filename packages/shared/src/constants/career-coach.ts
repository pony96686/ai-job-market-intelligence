// Bounded context per call (not the full history) — keeps cost bounded as a
// conversation grows. Shared between apps/web's Career Coach route and
// apps/worker's agent_handoff opener generation so both build the same
// amount of context for a runCareerCoachTurn call.
export const CAREER_COACH_HISTORY_CONTEXT_LIMIT = 20;
