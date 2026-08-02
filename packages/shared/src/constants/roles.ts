// Fixed engineering-role taxonomy — the codebase has no clean role taxonomy
// column (Job.role is free-text, mostly literal job titles), so this
// curated list stands in as "the roles we know about" wherever one is
// needed: the Skill Heatmap (one API call per role) and
// getCareerPathRecommendations (candidate paths to evaluate).
export const CANDIDATE_ENGINEERING_ROLES = [
  'Backend Engineer',
  'Frontend Engineer',
  'Full-Stack Engineer',
  'DevOps Engineer',
  'Mobile Engineer',
  'Data Engineer',
] as const;
