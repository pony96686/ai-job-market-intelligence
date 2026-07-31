export interface SkillGapResult {
  matchPercent: number;
  missingSkills: string[];
}

// Pure statistics, no LLM call, safe to run on every targetRole switch.
export function computeSkillGap(requiredSkills: string[], userSkills: string[]): SkillGapResult {
  if (requiredSkills.length === 0) {
    return { matchPercent: 0, missingSkills: [] };
  }

  const userSkillSet = new Set(userSkills.map((s) => s.toLowerCase().trim()));
  const missingSkills = requiredSkills.filter((skill) => !userSkillSet.has(skill.toLowerCase().trim()));
  const matchPercent = Math.round(((requiredSkills.length - missingSkills.length) / requiredSkills.length) * 100);

  return { matchPercent, missingSkills };
}
