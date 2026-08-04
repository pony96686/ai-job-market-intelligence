import type { Job } from 'bullmq';
import {
  prisma,
  upsertJobEmbedding,
  getJobEmbedding,
  findSimilarJobs,
  recordAlsoSeenOn,
} from '@ai-job-market-intelligence/db';
import {
  parseJobFields,
  generateEmbedding,
  buildJobText,
  buildStructuredJobFields,
} from '@ai-job-market-intelligence/ai';
import {
  computeContentHash,
  type NormalizedJob,
} from '@ai-job-market-intelligence/shared/ingestion';
import { extractLocationCountry } from '@ai-job-market-intelligence/shared/regions';
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

// Deterministic, no LLM — Himalayas provides its own structured
// locationRestrictions array; every other source only has the free-text
// `location` string.
function computeLocationCountry(normalized: NormalizedJob): string | null {
  return extractLocationCountry(normalized.locationRestrictions ?? normalized.location);
}

export async function processIngestionParse(job: Job<IngestionParsePayload>): Promise<void> {
  const { normalized, companyId } = job.data;
  const traceId = job.id!;

  const existing = await prisma.job.findUnique({
    where: { source_externalId: { source: normalized.source, externalId: normalized.externalId } },
  });

  const contentHash = computeContentHash(normalized);

  // Same content as last crawl → only metadata needs a touch, skip
  // re-running AI Job Parsing + embedding + dedup entirely — but only if
  // both actually succeeded last time:
  // - If a prior attempt's upsertJobEmbedding write failed after the job row
  //   itself had already been committed, the job would otherwise be stuck
  //   embedding-less forever, since contentHash never changes again on its
  //   own.
  // - If AI Job Parsing hit a transient failure (e.g. LLM rate limiting),
  //   parseJobFields doesn't throw — it returns confidence=0 with empty
  //   fields so ingestion isn't blocked — but that
  //   "success" then permanently freezes this job at confidence=0/no skills
  //   the same way, since nothing about it looks like a failure to retry.
  //   sourceStructured sources (Himalayas) never hit this: their fields come
  //   straight from the source, not an LLM call, so confidence is always 1.0.
  if (existing && existing.contentHash === contentHash) {
    const hasEmbedding = (await getJobEmbedding(existing.id)) !== null;
    const needsReparse = !normalized.sourceStructured && existing.parseConfidence === 0;

    if (hasEmbedding && !needsReparse) {
      await prisma.job.update({
        where: { id: existing.id },
        data: { postedAt: normalized.postedAt, updatedAt: new Date() },
      });
      logger.info({ event: 'ingestion_parse_skip_unchanged', traceId, jobId: existing.id });
      return;
    }

    if (needsReparse) {
      logger.warn({ event: 'ingestion_parse_reparse_retry', traceId, jobId: existing.id });
    }
    if (!hasEmbedding) {
      logger.warn({
        event: 'ingestion_parse_embedding_missing_retry',
        traceId,
        jobId: existing.id,
      });
    }

    const parsed = needsReparse
      ? await parseJobFields({
          title: normalized.title,
          description: normalized.description,
          tags: normalized.tags,
        })
      : null;

    if (!hasEmbedding) {
      const embeddingText = buildJobText({
        title: normalized.title,
        company: normalized.company,
        tags: normalized.tags,
        description: normalized.description,
      });
      const embedding = await generateEmbedding(embeddingText);
      await upsertJobEmbedding(
        existing.id,
        embedding,
        process.env.EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL,
      );
    }

    await prisma.job.update({
      where: { id: existing.id },
      data: {
        ...(parsed && {
          role: parsed.role || null,
          level: parsed.level,
          skills: parsed.skills,
          salaryMin: parsed.salaryMin ?? normalized.salaryMin ?? null,
          salaryMax: parsed.salaryMax ?? normalized.salaryMax ?? null,
          eligibleRegions: parsed.eligibleRegions,
          parseConfidence: parsed.confidence,
        }),
        locationCountry: computeLocationCountry(normalized),
        postedAt: normalized.postedAt,
        updatedAt: new Date(),
      },
    });

    logger.info({ event: 'ingestion_parse_retry_complete', traceId, jobId: existing.id });
    await enqueueScoringForJob(existing.id);
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
      locationCountry: computeLocationCountry(normalized),
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
      locationCountry: computeLocationCountry(normalized),
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
