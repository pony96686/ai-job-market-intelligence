-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobSource" ADD VALUE 'GREENHOUSE';
ALTER TYPE "JobSource" ADD VALUE 'LEVER';
ALTER TYPE "JobSource" ADD VALUE 'WEWORKREMOTELY';
ALTER TYPE "JobSource" ADD VALUE 'HACKERNEWS';

-- AlterTable
ALTER TABLE "job_scores" ADD COLUMN     "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "skill_gap" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "scoring_version" SET DEFAULT 'v2';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "also_seen_on" "JobSource"[] DEFAULT ARRAY[]::"JobSource"[],
ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "level" TEXT,
ADD COLUMN     "parse_confidence" DOUBLE PRECISION,
ADD COLUMN     "remote" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "salary_max" INTEGER,
ADD COLUMN     "salary_min" INTEGER;

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "jobs_role_idx" ON "jobs"("role");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Manual: Prisma's migrate diff engine does not track changes inside
-- Unsupported() type strings, so the vector dimension change below must be
-- written by hand (same situation as the 20260729151915_embedding_vector_2048
-- migration). This reverts that migration: ai-scoring.md §3.1 specifies
-- text-embedding-3-small (1536 dims) as the production embedding model, and
-- packages/ai/src/embeddings/generate.ts defaults to that model, so a
-- vector(2048) column silently breaks embedding inserts in production. Both
-- tables are confirmed empty (no real embeddings generated yet), so this is
-- a safe direct ALTER, no data migration needed.
ALTER TABLE "job_embeddings" ALTER COLUMN "embedding" TYPE vector(1536);
ALTER TABLE "user_profiles" ALTER COLUMN "profile_embedding" TYPE vector(1536);
