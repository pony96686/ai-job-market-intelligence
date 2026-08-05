import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import { createCareerCoachToolExecutor } from '../career-coach-tools';

// Integration test against a real Postgres.
const TEST_PREFIX = 'test-career-coach-tools-';

async function createTestUser(emailSuffix: string) {
  return prisma.user.create({ data: { email: `${TEST_PREFIX}${emailSuffix}@example.com` } });
}

async function createTestJob() {
  return prisma.job.create({
    data: {
      externalId: `${TEST_PREFIX}${crypto.randomUUID()}`,
      source: 'REMOTEOK',
      title: 'Senior Backend Engineer',
      company: 'Acme Co',
      role: 'Backend Engineer',
      description: 'A'.repeat(100),
      url: 'https://example.com/job',
      location: 'Remote',
      tags: [],
      alsoSeenOn: [],
    },
  });
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } });
  await prisma.job.deleteMany({ where: { externalId: { startsWith: TEST_PREFIX } } });
  await prisma.$disconnect();
});

describe('createCareerCoachToolExecutor — get_job_context', () => {
  it("returns the job's title/company/role plus the requesting user's own strengths/reasoning", async () => {
    const user = await createTestUser('owner');
    const job = await createTestJob();
    await prisma.jobScore.create({
      data: {
        jobId: job.id,
        userId: user.id,
        score: 82,
        decision: 'APPLY',
        reasoning: 'Strong skills match for this role.',
        strengths: ['TypeScript', 'Node.js'],
        skillGap: [],
        llmScore: 85,
        embeddingScore: 80,
        ruleScore: 70,
      },
    });

    const executor = createCareerCoachToolExecutor(user.id);
    const result = await executor({ name: 'get_job_context', arguments: { jobId: job.id } });

    expect(result).toEqual({
      title: 'Senior Backend Engineer',
      company: 'Acme Co',
      role: 'Backend Engineer',
      strengths: ['TypeScript', 'Node.js'],
      reasoning: 'Strong skills match for this role.',
    });
  });

  it("does not return another user's job_scores data for the same job", async () => {
    const owner = await createTestUser('real-owner');
    const stranger = await createTestUser('stranger');
    const job = await createTestJob();
    await prisma.jobScore.create({
      data: {
        jobId: job.id,
        userId: owner.id,
        score: 82,
        decision: 'APPLY',
        reasoning: "Owner's own reasoning.",
        strengths: ['TypeScript'],
        skillGap: [],
        llmScore: 85,
        embeddingScore: 80,
        ruleScore: 70,
      },
    });

    const executor = createCareerCoachToolExecutor(stranger.id);
    const result = await executor({ name: 'get_job_context', arguments: { jobId: job.id } });

    expect(result).toEqual({ error: 'This job is not associated with the current user.' });
  });

  it('returns an error for a jobId that has no job_scores row at all', async () => {
    const user = await createTestUser('no-score');

    const executor = createCareerCoachToolExecutor(user.id);
    const result = await executor({ name: 'get_job_context', arguments: { jobId: 'nonexistent' } });

    expect(result).toEqual({ error: 'This job is not associated with the current user.' });
  });
});
