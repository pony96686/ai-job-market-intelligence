import type { JobInput, ProfileInput } from '../types';

const JOB_DESCRIPTION_TEXT_LIMIT = 2000;

// Narrowed to just the fields actually used — region data plays no part in
// the embedding text, and requiring the full JobInput would force every
// caller to fabricate an eligibleRegions value it doesn't have yet.
export function buildJobText(
  job: Pick<JobInput, 'title' | 'company' | 'tags' | 'description'>,
): string {
  return [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Tags: ${job.tags.join(', ')}`,
    `Description: ${job.description.slice(0, JOB_DESCRIPTION_TEXT_LIMIT)}`,
  ].join('\n');
}

export function buildProfileText(
  profile: Pick<ProfileInput, 'skills' | 'experienceYears' | 'preferredRoles'>,
): string {
  return [
    `Skills: ${profile.skills.join(', ')}`,
    `Experience: ${profile.experienceYears} years`,
    `Preferred roles: ${profile.preferredRoles.join(', ')}`,
  ].join('\n');
}
