import { slugify } from '@ai-job-market-intelligence/shared/ingestion';
import { prisma } from './client';
import type { Company } from '@prisma/client';

// jobs.company is upgraded from a plain string to a Company entity so
// differently-cased/spaced names ("Acme Inc" vs "acme inc.") don't fragment
// into separate companies.
export async function upsertCompany(name: string): Promise<Company> {
  const slug = slugify(name);
  return prisma.company.upsert({
    where: { slug },
    create: { slug, name },
    update: {},
  });
}
