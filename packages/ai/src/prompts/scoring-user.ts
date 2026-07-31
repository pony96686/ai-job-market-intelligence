import type { JobInput, ProfileInput } from '../types';

const JOB_DESCRIPTION_LLM_LIMIT = 3000;

export function buildScoringUserPrompt(profile: ProfileInput, job: JobInput): string {
  return `## Candidate Profile
- Skills: ${profile.skills.join(', ')}
- Experience: ${profile.experienceYears} years
- Preferred roles: ${profile.preferredRoles.join(', ')}

## Job Posting
- Title: ${job.title}
- Company: ${job.company}
- Tags: ${job.tags.join(', ')}
- Description:
${job.description.slice(0, JOB_DESCRIPTION_LLM_LIMIT)}

Evaluate the match and respond with JSON.`;
}
