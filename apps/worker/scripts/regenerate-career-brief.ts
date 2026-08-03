import { prisma } from '@ai-job-market-intelligence/db';
import { processCareerBriefGenerate } from '../src/processors/career-brief-generate.js';

// Manually re-runs career_brief_generate for a single user, bypassing the
// usual career_agent_daily -> BullMQ enqueue path (which needs Redis
// connectivity this ad-hoc script doesn't have) by calling the same
// processor function directly with the target user's id.
// Run with:
//   $env:EMAIL = "you@example.com"
//   pnpm --filter @ai-job-market-intelligence/worker exec tsx scripts/regenerate-career-brief.ts

async function main() {
  const email = process.env.EMAIL;
  if (!email) throw new Error('Set EMAIL=<user email> before running this script.');

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });

  await processCareerBriefGenerate({
    id: 'manual-regenerate',
    data: { userId: user.id },
  } as never);

  console.log(`Regenerated career brief for ${email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
