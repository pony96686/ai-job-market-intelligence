import type { JobDecision } from '@ai-job-market-intelligence/shared';
import { CURRENT_SCORING_VERSION } from '@ai-job-market-intelligence/shared/constants';
import { containsInjectionPattern } from '@ai-job-market-intelligence/shared/security';
import { computeEmbeddingScore } from '../embeddings/similarity';
import type { JobInput, ProfileInput } from '../types';
import { computeRuleScore } from './rule-score';
import { computeLLMScore, type LLMScoreResult } from './llm-score';
import { toDecision } from './decision';

// The ingestion-time filter is the "before" line of defense — this is the
// "after" backstop in case some new injection technique slips past it.
// Reuses the same pattern list rather than maintaining a second one.
function isSuspectedInjection(result: LLMScoreResult): boolean {
  return (
    containsInjectionPattern(result.reasoning) ||
    result.strengths.some(containsInjectionPattern) ||
    result.skillGap.some(containsInjectionPattern)
  );
}

export interface ScoringResult {
  score: number;
  decision: JobDecision;
  reasoning: string;
  strengths: string[];
  skillGap: string[];
  llmScore: number;
  embeddingScore: number;
  ruleScore: number;
  scoringVersion: typeof CURRENT_SCORING_VERSION;
}

// Go straight to SKIP without calling the LLM when both embedding and rule
// scores are low (saves cost)
const EMBEDDING_SKIP_THRESHOLD = 20;
const RULE_SKIP_THRESHOLD = 30;

export async function scoreJob(
  profile: ProfileInput,
  job: JobInput,
  embeddings: { profile: number[]; job: number[] },
): Promise<ScoringResult> {
  const embeddingScore = computeEmbeddingScore(embeddings.profile, embeddings.job);
  const ruleScore = computeRuleScore(profile, job);

  if (embeddingScore < EMBEDDING_SKIP_THRESHOLD && ruleScore < RULE_SKIP_THRESHOLD) {
    return {
      score: Math.round(0.4 * embeddingScore + 0.6 * ruleScore),
      decision: 'SKIP',
      reasoning:
        'Low semantic and rule-based match. Skills and experience do not align with this role.',
      strengths: [],
      skillGap: [],
      llmScore: 0,
      embeddingScore,
      ruleScore,
      scoringVersion: CURRENT_SCORING_VERSION,
    };
  }

  const llmResult = await computeLLMScore(profile, job);
  const injectionSuspected = llmResult !== null && isSuspectedInjection(llmResult);

  if (injectionSuspected) {
    // Discard the (possibly manipulated) output and log for manual review —
    // don't retry the LLM (the same payload would likely get poisoned again)
    // and don't surface anything to the user, so as not to tip off whoever
    // is probing the filter.
    console.warn({
      event: 'llm_output_injection_suspected',
      title: job.title,
      company: job.company,
    });
  }

  if (!llmResult || injectionSuspected) {
    // Fall back to rule_score when the LLM fails entirely, or its output is
    // discarded as suspected prompt injection
    const finalScore = Math.round(0.6 * ruleScore + 0.4 * embeddingScore);
    return {
      score: finalScore,
      decision: toDecision(finalScore),
      reasoning:
        'AI analysis temporarily unavailable. Score based on skill and experience matching.',
      strengths: [],
      skillGap: [],
      llmScore: ruleScore,
      embeddingScore,
      ruleScore,
      scoringVersion: CURRENT_SCORING_VERSION,
    };
  }

  const finalScore = Math.round(0.4 * llmResult.score + 0.4 * embeddingScore + 0.2 * ruleScore);

  return {
    score: finalScore,
    decision: toDecision(finalScore),
    reasoning: llmResult.reasoning,
    strengths: llmResult.strengths,
    skillGap: llmResult.skillGap,
    llmScore: llmResult.score,
    embeddingScore,
    ruleScore,
    scoringVersion: CURRENT_SCORING_VERSION,
  };
}
