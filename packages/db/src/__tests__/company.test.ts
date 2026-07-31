import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import { upsertCompany } from '../company';

// Integration test against a real Postgres (run against DATABASE_URL,
// migrated but not truncated between suites). Uses a distinct slug prefix so
// it never collides with dev seed data.
const TEST_SLUG_PREFIX = 'test-company-';

afterAll(async () => {
  await prisma.company.deleteMany({ where: { slug: { startsWith: TEST_SLUG_PREFIX } } });
  await prisma.$disconnect();
});

describe('upsertCompany', () => {
  it('creates a company normalized to a slug', async () => {
    const company = await upsertCompany(`${TEST_SLUG_PREFIX}Acme Inc`);
    expect(company.name).toBe(`${TEST_SLUG_PREFIX}Acme Inc`);
    expect(company.slug).toBe(`${TEST_SLUG_PREFIX}acme-inc`);
  });

  it('is idempotent for the same normalized name', async () => {
    const first = await upsertCompany(`${TEST_SLUG_PREFIX}Widget Co`);
    const second = await upsertCompany(`${TEST_SLUG_PREFIX}Widget Co`);
    expect(second.id).toBe(first.id);
  });

  it('normalizes differently-cased/spaced names to the same company', async () => {
    const first = await upsertCompany(`${TEST_SLUG_PREFIX}Gamma Ltd`);
    const second = await upsertCompany(`${TEST_SLUG_PREFIX}gamma ltd.`);
    expect(second.id).toBe(first.id);
  });
});
