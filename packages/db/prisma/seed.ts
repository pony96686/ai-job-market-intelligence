import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'dev@test.com' },
    update: {},
    create: {
      email: 'dev@test.com',
      onboardingCompleted: true,
      subscription: { create: { plan: 'FREE' } },
      profile: {
        create: {
          skills: ['Node.js', 'TypeScript', 'React'],
          experienceYears: 5,
          preferredRoles: ['Full-stack Engineer'],
        },
      },
    },
  });

  const sampleJobs = [
    {
      externalId: 'seed-1',
      title: 'Senior Backend Engineer',
      company: 'Acme Inc',
      description: 'Build and scale our Node.js/TypeScript backend services.',
      url: 'https://remoteok.com/remote-jobs/seed-1',
      tags: ['node', 'typescript', 'postgresql'],
    },
    {
      externalId: 'seed-2',
      title: 'Frontend Engineer (React)',
      company: 'Widgets Co',
      description: 'Own our React + Next.js customer dashboard.',
      url: 'https://remoteok.com/remote-jobs/seed-2',
      tags: ['react', 'next.js', 'typescript'],
    },
    {
      externalId: 'seed-3',
      title: 'Full-stack Engineer',
      company: 'Startup Labs',
      description: 'Ship features across our full-stack TypeScript monorepo.',
      url: 'https://remoteok.com/remote-jobs/seed-3',
      tags: ['fullstack', 'typescript', 'node'],
    },
    {
      externalId: 'seed-4',
      title: 'DevOps Engineer',
      company: 'CloudNine',
      description: 'Manage Kubernetes infrastructure and CI/CD pipelines.',
      url: 'https://remoteok.com/remote-jobs/seed-4',
      tags: ['kubernetes', 'devops', 'aws'],
    },
    {
      externalId: 'seed-5',
      title: 'Data Engineer',
      company: 'DataWorks',
      description: 'Build data pipelines with Python and Airflow.',
      url: 'https://remoteok.com/remote-jobs/seed-5',
      tags: ['python', 'airflow', 'data'],
    },
  ];

  for (const jobData of sampleJobs) {
    const job = await prisma.job.upsert({
      where: { source_externalId: { source: 'REMOTEOK', externalId: jobData.externalId } },
      update: {},
      create: {
        ...jobData,
        source: 'REMOTEOK',
        location: 'Remote',
        postedAt: new Date(),
      },
    });

    await prisma.jobScore.upsert({
      where: { jobId_userId: { jobId: job.id, userId: user.id } },
      update: {},
      create: {
        jobId: job.id,
        userId: user.id,
        score: 75,
        decision: 'MAYBE',
        reasoning: 'Seed placeholder score for local UI development.',
        skillGap: ['Kubernetes'],
        llmScore: 75,
        embeddingScore: 75,
        ruleScore: 75,
      },
    });
  }

  // E2E test user (E2E always uses e2e@test.com). Jobs are a
  // platform-shared resource, so this reuses the 5 seed jobs
  // above and only scores them for this user, covering all three decisions
  // (APPLY/MAYBE/SKIP); seed-5 is deliberately left unscored to test the
  // "not yet scored" case.
  const e2eUser = await prisma.user.upsert({
    where: { email: 'e2e@test.com' },
    update: {},
    create: {
      email: 'e2e@test.com',
      onboardingCompleted: true,
      subscription: { create: { plan: 'FREE' } },
      profile: {
        create: {
          skills: ['Node.js', 'TypeScript', 'React'],
          experienceYears: 5,
          preferredRoles: ['Full-stack Engineer', 'Backend Engineer'],
        },
      },
    },
  });

  const e2eScores: Record<string, { score: number; decision: 'APPLY' | 'MAYBE' | 'SKIP' }> = {
    'seed-1': { score: 85, decision: 'APPLY' },
    'seed-2': { score: 72, decision: 'MAYBE' },
    'seed-4': { score: 45, decision: 'SKIP' },
    'seed-3': { score: 88, decision: 'APPLY' },
  };

  for (const [externalId, s] of Object.entries(e2eScores)) {
    const job = await prisma.job.findUniqueOrThrow({
      where: { source_externalId: { source: 'REMOTEOK', externalId } },
    });
    await prisma.jobScore.upsert({
      where: { jobId_userId: { jobId: job.id, userId: e2eUser.id } },
      update: {},
      create: {
        jobId: job.id,
        userId: e2eUser.id,
        score: s.score,
        decision: s.decision,
        reasoning: `Seed score for E2E testing (${s.decision}).`,
        skillGap: s.decision === 'APPLY' ? [] : ['Kubernetes'],
        llmScore: s.score,
        embeddingScore: s.score - 5,
        ruleScore: s.score - 3,
      },
    });
  }

  // e2e/onboarding-flow.spec.ts: a never-onboarded user so the onboarding
  // E2E test can walk through a real first-run instead of reusing
  // e2e@test.com, which already has onboardingCompleted=true.
  const onboardingUser = await prisma.user.upsert({
    where: { email: 'e2e-onboarding@test.com' },
    update: { onboardingCompleted: false },
    create: {
      email: 'e2e-onboarding@test.com',
      onboardingCompleted: false,
    },
  });
  await prisma.userProfile.deleteMany({ where: { userId: onboardingUser.id } });
  await prisma.careerProfile.deleteMany({ where: { userId: onboardingUser.id } });
  // A real signup always gets a subscription row immediately (see the
  // createUser event in apps/web/lib/auth.ts) — this fixture bypasses that
  // adapter lifecycle, so it must be created here too, or any page touching
  // billing (e.g. /settings/billing) 500s with a missing-record error.
  await prisma.subscription.upsert({
    where: { userId: onboardingUser.id },
    update: {},
    create: { userId: onboardingUser.id, plan: 'FREE' },
  });

  console.log(`Seed complete. User: ${user.email}, Jobs: ${sampleJobs.length}`);
  console.log(`E2E user: ${e2eUser.email}, scored jobs: ${Object.keys(e2eScores).length}`);
  console.log(`E2E onboarding user: ${onboardingUser.email} (fresh, not onboarded)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
