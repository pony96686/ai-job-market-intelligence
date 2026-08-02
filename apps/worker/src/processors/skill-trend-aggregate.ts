import type { Job } from 'bullmq';
import { prisma } from '@ai-job-market-intelligence/db';
import { computeSkillTrendSnapshots } from '@ai-job-market-intelligence/ai';
import type { SkillTrendAggregatePayload } from '@ai-job-market-intelligence/shared/queue';
import { logger } from '../logger.js';

// Whole-table sweep: scans every ACTIVE job's skills once, recomputes all
// 30/90/365-day windows, and upserts skills + snapshots. Idempotent — safe
// to re-run for the same day (unique on skillId+windowDays+periodEnd).
export async function processSkillTrendAggregate(
  job: Job<SkillTrendAggregatePayload>,
): Promise<void> {
  const traceId = job.id!;

  const jobs = await prisma.job.findMany({
    where: { status: 'ACTIVE', skills: { isEmpty: false } },
    select: { skills: true, postedAt: true, createdAt: true },
  });

  const records = jobs.map((j) => ({ skills: j.skills, effectiveDate: j.postedAt ?? j.createdAt }));
  const snapshots = computeSkillTrendSnapshots(records, new Date());

  const skillNameBySlug = new Map(snapshots.map((s) => [s.slug, s.name]));
  const skillIdBySlug = new Map<string, string>();

  for (const [slug, name] of skillNameBySlug) {
    const skill = await prisma.skill.upsert({
      where: { slug },
      create: { slug, name },
      update: { name },
    });
    skillIdBySlug.set(slug, skill.id);
  }

  for (const snapshot of snapshots) {
    const skillId = skillIdBySlug.get(snapshot.slug)!;
    await prisma.skillTrendSnapshot.upsert({
      where: {
        skillId_windowDays_periodEnd: {
          skillId,
          windowDays: snapshot.windowDays,
          periodEnd: snapshot.periodEnd,
        },
      },
      create: {
        skillId,
        windowDays: snapshot.windowDays,
        periodEnd: snapshot.periodEnd,
        jobCount: snapshot.jobCount,
        growthPercent: snapshot.growthPercent,
      },
      update: {
        jobCount: snapshot.jobCount,
        growthPercent: snapshot.growthPercent,
      },
    });
  }

  logger.info({
    event: 'skill_trend_aggregate_complete',
    traceId,
    jobsScanned: jobs.length,
    skillsTracked: skillIdBySlug.size,
    snapshotsWritten: snapshots.length,
  });
}
