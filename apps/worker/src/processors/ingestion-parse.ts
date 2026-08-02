import type { Job } from 'bullmq';
import {
  prisma,
  upsertJobEmbedding,
  findSimilarJobs,
  recordAlsoSeenOn,
} from '@ai-job-market-intelligence/db';
import {
  parseJobFields,
  generateEmbedding,
  buildJobText,
  buildStructuredJobFields,
} from '@ai-job-market-intelligence/ai';
import { computeContentHash } from '@ai-job-market-intelligence/shared/ingestion';
import {
  getScoringMatchQueue,
  SCORING_MATCH_JOB_OPTS,
  type IngestionParsePayload,
} from '@ai-job-market-intelligence/shared/queue';
import { logger } from '../logger.js';

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
// Conservative threshold, calibrated post-launch against a 100-sample
// manual audit.
const DEDUP_SIMILARITY_THRESHOLD = 0.92;
const DEDUP_WINDOW_DAYS = 14;

export async function processIngestionParse(job: Job<IngestionParsePayload>): Promise<void> {
  const { normalized, companyId } = job.data;
  const traceId = job.id!;

  const existing = await prisma.job.findUnique({
    where: { source_externalId: { source: normalized.source, externalId: normalized.externalId } },
  });

  const contentHash = computeContentHash(normalized);

  // Same content as last crawl → only metadata needs a touch, skip
  // re-running AI Job Parsing + embedding + dedup entirely.
  if (existing && existing.contentHash === contentHash) {
    await prisma.job.update({
      where: { id: existing.id },
      data: { postedAt: normalized.postedAt, updatedAt: new Date() },
    });
    logger.info({ event: 'ingestion_parse_skip_unchanged', traceId, jobId: existing.id });
    return;
  }

  const title = normalized.title;
  const company = normalized.company;
  const resolvedCompanyId = companyId;

  // sourceStructured sources (Himalayas) already provide salary/seniority
  // natively — skip the LLM call entirely.
  const parsed = normalized.sourceStructured
    ? buildStructuredJobFields(normalized)
    : await parseJobFields({ title, description: normalized.description, tags: normalized.tags });

  const embeddingText = buildJobText({
    title,
    company,
    tags: normalized.tags,
    description: normalized.description,
  });
  const embedding = await generateEmbedding(embeddingText);

  if (!existing) {
    const candidates = await findSimilarJobs(embedding, {
      threshold: DEDUP_SIMILARITY_THRESHOLD,
      sameCompany: company,
      postedWithinDays: DEDUP_WINDOW_DAYS,
    });

    const canonical = candidates[0];
    if (canonical) {
      await recordAlsoSeenOn(canonical.id, normalized.source);
      logger.info({
        event: 'ingestion_dedup_hit',
        traceId,
        canonicalJobId: canonical.id,
        source: normalized.source,
      });
      return;
    }
  }

  const saved = await prisma.job.upsert({
    where: { source_externalId: { source: normalized.source, externalId: normalized.externalId } },
    create: {
      externalId: normalized.externalId,
      source: normalized.source,
      companyId: resolvedCompanyId,
      title,
      company,
      role: parsed.role || null,
      level: parsed.level,
      skills: parsed.skills,
      salaryMin: parsed.salaryMin ?? normalized.salaryMin ?? null,
      salaryMax: parsed.salaryMax ?? normalized.salaryMax ?? null,
      salaryCurrency: normalized.salaryCurrency ?? null,
      salaryPeriod: normalized.salaryPeriod ?? null,
      remote: parsed.remote,
      eligibleRegions: parsed.eligibleRegions,
      parseConfidence: parsed.confidence,
      sourceStructured: normalized.sourceStructured ?? false,
      contentHash,
      description: normalized.description,
      url: normalized.url,
      location: normalized.location,
      tags: normalized.tags,
      postedAt: normalized.postedAt,
    },
    update: {
      title,
      company,
      role: parsed.role || null,
      level: parsed.level,
      skills: parsed.skills,
      salaryMin: parsed.salaryMin ?? normalized.salaryMin ?? null,
      salaryMax: parsed.salaryMax ?? normalized.salaryMax ?? null,
      salaryCurrency: normalized.salaryCurrency ?? null,
      salaryPeriod: normalized.salaryPeriod ?? null,
      eligibleRegions: parsed.eligibleRegions,
      parseConfidence: parsed.confidence,
      contentHash,
      description: normalized.description,
      tags: normalized.tags,
      status: 'ACTIVE',
      closedAt: null,
      updatedAt: new Date(),
    },
  });

  await upsertJobEmbedding(
    saved.id,
    embedding,
    process.env.EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL,
  );

  logger.info({
    event: 'ingestion_parse_complete',
    traceId,
    jobId: saved.id,
    source: normalized.source,
    confidence: parsed.confidence,
  });

  await enqueueScoringForJob(saved.id);
}

async function enqueueScoringForJob(jobId: string): Promise<void> {
  const users = await prisma.user.findMany({
    where: { onboardingCompleted: true },
    select: { id: true },
  });

  const queue = getScoringMatchQueue();
  for (const user of users) {
    await queue.add(
      'score',
      { jobId, userId: user.id },
      { ...SCORING_MATCH_JOB_OPTS, jobId: `score:${jobId}:${user.id}` },
    );
  }
}
