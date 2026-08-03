import { prisma } from './client';
import {
  getCareerPathRecommendations,
  getSalaryRange,
  normalizeToAnnualUSD,
  type CareerPathRoleJobs,
  type CareerCoachToolExecutor,
} from '@ai-job-market-intelligence/ai';
import { CANDIDATE_ENGINEERING_ROLES } from '@ai-job-market-intelligence/shared/constants';

const DEFAULT_SKILL_TREND_WINDOW_DAYS = 90;
const VALID_WINDOW_DAYS = [30, 90, 365];

async function getCareerPathsTool(userId: string): Promise<unknown> {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) return { error: 'This user has not completed onboarding yet.' };

  const candidateRoleJobs: CareerPathRoleJobs[] = await Promise.all(
    CANDIDATE_ENGINEERING_ROLES.map(async (role) => ({
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
  );

  return getCareerPathRecommendations(profile.skills, candidateRoleJobs);
}

async function getSkillTrendTool(args: Record<string, unknown>): Promise<unknown> {
  const skill = String(args.skill ?? '').trim();
  if (!skill) return { error: 'No skill name provided.' };

  const windowDays = VALID_WINDOW_DAYS.includes(Number(args.windowDays))
    ? Number(args.windowDays)
    : DEFAULT_SKILL_TREND_WINDOW_DAYS;

  const skillRecord = await prisma.skill.findFirst({
    where: {
      OR: [{ slug: skill.toLowerCase() }, { name: { equals: skill, mode: 'insensitive' } }],
    },
  });
  if (!skillRecord) return { error: `"${skill}" is not a tracked skill yet.` };

  const snapshot = await prisma.skillTrendSnapshot.findFirst({
    where: { skillId: skillRecord.id, windowDays },
    orderBy: { periodEnd: 'desc' },
  });
  if (!snapshot) return { error: `No trend data yet for "${skill}".` };

  return {
    skill: skillRecord.name,
    windowDays,
    jobCount: snapshot.jobCount,
    growthPercent: snapshot.growthPercent,
  };
}

async function getSalaryRangeTool(args: Record<string, unknown>): Promise<unknown> {
  const role = String(args.role ?? '').trim();
  if (!role) return { error: 'No role provided.' };
  const region = String(args.region ?? 'global');

  const jobs = await prisma.job.findMany({
    where: {
      status: 'ACTIVE',
      role: { contains: role, mode: 'insensitive' },
      OR: [{ salaryMin: { not: null } }, { salaryMax: { not: null } }],
    },
    select: { salaryMin: true, salaryMax: true, salaryPeriod: true },
  });

  const annualSalaries = jobs
    .map((j) => {
      const top = j.salaryMax ?? j.salaryMin;
      return top == null ? null : normalizeToAnnualUSD(top, j.salaryPeriod);
    })
    .filter((n): n is number => n !== null);

  return getSalaryRange(role, region, annualSalaries);
}

// Tool execution needs Prisma, which packages/ai deliberately doesn't
// depend on — this is the DB-backed implementation of the tool contract
// runCareerCoachTurn calls into, scoped to the requesting user. Lives in
// packages/db (rather than duplicated per-app) since both apps/web (the
// user-facing Career Coach chat) and apps/worker (the agent_handoff opener)
// need the exact same tool behavior.
export function createCareerCoachToolExecutor(userId: string): CareerCoachToolExecutor {
  return async ({ name, arguments: args }) => {
    switch (name) {
      case 'get_career_paths':
        return getCareerPathsTool(userId);
      case 'get_skill_trend':
        return getSkillTrendTool(args);
      case 'get_salary_range':
        return getSalaryRangeTool(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  };
}
