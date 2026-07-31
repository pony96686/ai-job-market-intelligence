import type { JobInput, ProfileInput } from '../types';

const JOB_DESCRIPTION_TEXT_LIMIT = 2000;

export function buildJobText(job: JobInput): string {
  return [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Tags: ${job.tags.join(', ')}`,
    `Description: ${job.description.slice(0, JOB_DESCRIPTION_TEXT_LIMIT)}`,
  ].join('\n');
}

export function buildProfileText(profile: ProfileInput): string {
  return [
    `Skills: ${profile.skills.join(', ')}`,
    `Experience: ${profile.experienceYears} years`,
    `Preferred roles: ${profile.preferredRoles.join(', ')}`,
  ].join('\n');
}
