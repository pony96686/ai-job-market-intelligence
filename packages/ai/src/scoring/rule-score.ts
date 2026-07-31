import type { JobInput, ProfileInput } from '../types';

const SKILL_WEIGHT = 60;
const EXPERIENCE_CLOSE_SCORE = 25;
const EXPERIENCE_NEAR_SCORE = 15;
const EXPERIENCE_FAR_SCORE = 5;
const ROLE_MATCH_SCORE = 15;

interface SeniorityRange {
  pattern: RegExp;
  mid: number;
}

// staff/principal/lead maps to "10+ years", using 15 as the representative midpoint
const SENIORITY_RANGES: SeniorityRange[] = [
  { pattern: /\b(intern|junior)\b/i, mid: 1 },
  { pattern: /\b(senior|sr)\b/i, mid: 7.5 },
  { pattern: /\b(staff|principal|lead)\b/i, mid: 15 },
];
const DEFAULT_SENIORITY_MID = 3.5; // mid-level / no keyword match -> 2-5 years

function inferSeniorityMid(title: string): number {
  const match = SENIORITY_RANGES.find((range) => range.pattern.test(title));
  return match ? match.mid : DEFAULT_SENIORITY_MID;
}

function matchSkillsScore(skills: string[], job: JobInput): number {
  if (skills.length === 0) return 0;
  const jobText = `${job.title} ${job.description} ${job.tags.join(' ')}`.toLowerCase();
  const matched = skills.filter((skill) => jobText.includes(skill.toLowerCase()));
  return (matched.length / skills.length) * SKILL_WEIGHT;
}

function experienceScore(years: number, title: string): number {
  const expectedMid = inferSeniorityMid(title);
  const diff = Math.abs(years - expectedMid);
  if (diff <= 2) return EXPERIENCE_CLOSE_SCORE;
  if (diff <= 4) return EXPERIENCE_NEAR_SCORE;
  return EXPERIENCE_FAR_SCORE;
}

function roleScore(preferredRoles: string[], title: string): number {
  const titleLower = title.toLowerCase();
  const firstWord = titleLower.split(' ')[0] ?? '';
  const matched = preferredRoles.some((role) => {
    const roleLower = role.toLowerCase();
    return titleLower.includes(roleLower) || roleLower.includes(firstWord);
  });
  return matched ? ROLE_MATCH_SCORE : 0;
}

export function computeRuleScore(profile: ProfileInput, job: JobInput): number {
  const skillScore = matchSkillsScore(profile.skills, job);
  const expScore = experienceScore(profile.experienceYears, job.title);
  const role = roleScore(profile.preferredRoles, job.title);
  return Math.round(skillScore + expScore + role);
}
