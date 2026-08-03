import type { Job } from 'bullmq';
import { Resend } from 'resend';
import { prisma } from '@ai-job-market-intelligence/db';
import {
  getHotCompanies,
  getCareerPathRecommendations,
  type CareerPathRoleJobs,
} from '@ai-job-market-intelligence/ai';
import { CANDIDATE_ENGINEERING_ROLES } from '@ai-job-market-intelligence/shared/constants';
import type { CareerBriefGeneratePayload } from '@ai-job-market-intelligence/shared/queue';
import type { CareerBriefSummary } from '@ai-job-market-intelligence/shared';
import { renderCareerBriefEmail } from '../notifications/render-career-brief-email.js';
import { logger } from '../logger.js';

const TOP_GROWING_SKILLS_LIMIT = 5;
const HOT_COMPANIES_LIMIT = 5;
// Opportunity Discovery: replaces V1's instant
// notify_email trigger (score >= 80). scoring_match no longer sends email
// directly — high-match jobs surface here, in the next day's brief instead.
const OPPORTUNITY_SCORE_THRESHOLD = 85;
const OPPORTUNITY_WINDOW_HOURS = 24;
const RECOMMENDED_JOBS_LIMIT = 5;
const HOT_COMPANY_LOOKBACK_DAYS = 60; // covers getHotCompanies' current + prior 30-day windows
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

let resendClient: Resend | undefined;

function getResendClient(): Resend {
  resendClient ??= new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

async function buildSummary(userId: string, now: Date): Promise<CareerBriefSummary> {
  const profile = await prisma.userProfile.findUniqueOrThrow({ where: { userId } });

  const latestSnapshot = await prisma.skillTrendSnapshot.findFirst({
    where: { windowDays: 30 },
    orderBy: { periodEnd: 'desc' },
    select: { periodEnd: true },
  });

  const allSkillSnapshots = latestSnapshot
    ? await prisma.skillTrendSnapshot.findMany({
        where: { windowDays: 30, periodEnd: latestSnapshot.periodEnd },
        include: { skill: true },
      })
    : [];

  const skillGrowthMap = new Map(allSkillSnapshots.map((s) => [s.skill.slug, s.growthPercent]));

  const topGrowingSkills = allSkillSnapshots
    .filter((s) => s.growthPercent !== null)
    .sort((a, b) => b.growthPercent! - a.growthPercent!)
    .slice(0, TOP_GROWING_SKILLS_LIMIT)
    .map((s) => ({
      slug: s.skill.slug,
      name: s.skill.name,
      jobCount: s.jobCount,
      growthPercent: s.growthPercent,
    }));

  const lookbackStart = new Date(now.getTime() - HOT_COMPANY_LOOKBACK_DAYS * MS_PER_DAY);
  const [activeJobsByCompany, recentJobsByCompany, candidateRoleJobs, opportunities] =
    await Promise.all([
      prisma.job.findMany({ where: { status: 'ACTIVE' }, select: { company: true } }),
      prisma.job.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { postedAt: { gte: lookbackStart } },
            { postedAt: null, createdAt: { gte: lookbackStart } },
          ],
        },
        select: { company: true, postedAt: true, createdAt: true },
      }),
      Promise.all(
        CANDIDATE_ENGINEERING_ROLES.map(async (role): Promise<CareerPathRoleJobs> => ({
          role,
          jobs: await prisma.job.findMany({
            where: {
              status: 'ACTIVE',
              role: { contains: role, mode: 'insensitive' },
              skills: { isEmpty: false },
            },
            select: { skills: true },
          }),
        })),
      ),
      prisma.jobScore.findMany({
        where: {
          userId,
          score: { gte: OPPORTUNITY_SCORE_THRESHOLD },
          createdAt: { gte: new Date(now.getTime() - OPPORTUNITY_WINDOW_HOURS * MS_PER_HOUR) },
        },
        orderBy: { score: 'desc' },
        take: RECOMMENDED_JOBS_LIMIT,
        include: { job: { select: { id: true, title: true, company: true } } },
      }),
    ]);

  const hotCompanies = getHotCompanies(
    activeJobsByCompany,
    recentJobsByCompany.map((j) => ({
      company: j.company,
      effectiveDate: j.postedAt ?? j.createdAt,
    })),
    now,
    HOT_COMPANIES_LIMIT,
  );

  const [pathRecommendation] = getCareerPathRecommendations(
    profile.skills,
    candidateRoleJobs,
    skillGrowthMap,
  );
  const recommendedSkill = pathRecommendation?.missingSkills[0] ?? null;

  return {
    marketHighlights: { topGrowingSkills, hotCompanies },
    recommendedJobs: opportunities.map((o) => ({
      jobId: o.job.id,
      title: o.job.title,
      company: o.job.company,
      score: o.score,
    })),
    recommendedSkill,
  };
}

export async function processCareerBriefGenerate(
  job: Job<CareerBriefGeneratePayload>,
): Promise<void> {
  const { userId } = job.data;
  const traceId = job.id!;
  const now = new Date();
  const briefDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const summary = await buildSummary(userId, now);

  await prisma.careerBrief.upsert({
    where: { userId_briefDate: { userId, briefDate } },
    create: { userId, briefDate, summary },
    update: { summary },
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  try {
    const { error } = await getResendClient().emails.send({
      from: process.env.EMAIL_FROM!,
      to: user.email,
      subject: '📈 Your Daily Career Brief',
      html: renderCareerBriefEmail({ summary, appUrl: process.env.NEXT_PUBLIC_APP_URL! }),
    });
    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  } catch (error) {
    logger.error({
      event: 'career_brief_email_error',
      userId,
      traceId,
      error: (error as Error).message,
    });
    // Rethrow so BullMQ retries — safe to retry the whole job (including the
    // upsert above) since it's idempotent on (userId, briefDate).
    throw error;
  }

  logger.info({ event: 'career_brief_generate_complete', userId, traceId });
}
