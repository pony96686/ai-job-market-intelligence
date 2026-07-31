import type { Job } from 'bullmq';
import { prisma, upsertProfileEmbedding } from '@ai-job-market-intelligence/db';
import { buildProfileText, generateEmbedding, parseResumeFields, fetchGithubProfile } from '@ai-job-market-intelligence/ai';
import type { ProfileParsePayload } from '@ai-job-market-intelligence/shared/queue';
import { logger } from '../logger.js';
import { enqueueRescoring } from '../lib/rescoring.js';

const MAX_MERGED_SKILLS = 50;

function mergeSkills(existing: string[], additional: string[]): string[] {
  const seen = new Set(existing.map((s) => s.toLowerCase()));
  const merged = [...existing];
  for (const skill of additional) {
    if (!seen.has(skill.toLowerCase())) {
      seen.add(skill.toLowerCase());
      merged.push(skill);
    }
  }
  return merged.slice(0, MAX_MERGED_SKILLS);
}

async function regenerateProfileEmbedding(userId: string): Promise<void> {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) return;

  const embedding = await generateEmbedding(
    buildProfileText({
      skills: profile.skills,
      experienceYears: profile.experienceYears,
      preferredRoles: profile.preferredRoles,
    }),
  );
  await upsertProfileEmbedding(userId, embedding);
}

export async function processProfileParse(job: Job<ProfileParsePayload>): Promise<void> {
  const { userId, source } = job.data;
  const traceId = job.id!;

  if (source === 'resume') {
    const parsed = await parseResumeFields(job.data.resumeText);
    if (!parsed) {
      // Explicit FAILED (not just a log line) so the frontend can
      // distinguish "still processing" from "done, no result" instead of
      // polling forever.
      await prisma.careerProfile.upsert({
        where: { userId },
        create: { userId, resumeParseStatus: 'FAILED' },
        update: { resumeParseStatus: 'FAILED' },
      });
      logger.warn({ event: 'profile_parse_resume_failed', userId, traceId });
      return;
    }

    await prisma.careerProfile.upsert({
      where: { userId },
      create: {
        userId,
        resumeSkills: parsed.skills,
        resumeExperienceYears: parsed.experienceYears,
        resumeSummary: parsed.summary,
        resumeParseStatus: 'SUCCESS',
        resumeParsedAt: new Date(),
      },
      update: {
        resumeSkills: parsed.skills,
        resumeExperienceYears: parsed.experienceYears,
        resumeSummary: parsed.summary,
        resumeParseStatus: 'SUCCESS',
        resumeParsedAt: new Date(),
      },
    });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (profile) {
      await prisma.userProfile.update({
        where: { userId },
        data: { skills: mergeSkills(profile.skills, parsed.skills) },
      });
    }
  } else {
    const parsed = await fetchGithubProfile(job.data.githubUsername);
    if (!parsed) {
      // GitHub lookup failed (user not found / rate limited) — still record
      // the requested username so the UI can show a retry state instead of
      // silently doing nothing.
      await prisma.careerProfile.upsert({
        where: { userId },
        create: { userId, githubUsername: job.data.githubUsername, githubParseStatus: 'FAILED' },
        update: { githubUsername: job.data.githubUsername, githubParseStatus: 'FAILED' },
      });
      logger.warn({ event: 'profile_parse_github_failed', userId, traceId });
      return;
    }

    await prisma.careerProfile.upsert({
      where: { userId },
      create: {
        userId,
        githubUsername: job.data.githubUsername,
        githubLanguages: parsed.languages,
        githubSummary: parsed.summary,
        githubParseStatus: 'SUCCESS',
        githubParsedAt: new Date(),
      },
      update: {
        githubUsername: job.data.githubUsername,
        githubLanguages: parsed.languages,
        githubSummary: parsed.summary,
        githubParseStatus: 'SUCCESS',
        githubParsedAt: new Date(),
      },
    });
  }

  await regenerateProfileEmbedding(userId);
  await enqueueRescoring(userId);

  logger.info({ event: 'profile_parse_complete', userId, source, traceId });
}
