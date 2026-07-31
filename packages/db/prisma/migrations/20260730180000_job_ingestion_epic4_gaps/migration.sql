-- job-ingestion.md §3.6 (v3.3): finalized 5-source lineup (RemoteOK/Greenhouse/
-- Lever/Ashby/Himalayas). WeWorkRemotely/HN Who's Hiring are removed. Confirmed
-- via `SELECT DISTINCT source FROM jobs` before writing this migration that no
-- row uses WEWORKREMOTELY or HACKERNEWS (only REMOTEOK seed rows exist locally),
-- so this is a safe direct enum rebuild, no data migration needed.

-- AlterEnum: JobSource (Postgres has no DROP VALUE, so rebuild the type)
BEGIN;
CREATE TYPE "JobSource_new" AS ENUM ('REMOTEOK', 'GREENHOUSE', 'LEVER', 'ASHBY', 'HIMALAYAS');
ALTER TABLE "jobs" ALTER COLUMN "source" TYPE "JobSource_new" USING ("source"::text::"JobSource_new");
ALTER TABLE "jobs" ALTER COLUMN "also_seen_on" DROP DEFAULT;
ALTER TABLE "jobs" ALTER COLUMN "also_seen_on" TYPE "JobSource_new"[] USING ("also_seen_on"::text[]::"JobSource_new"[]);
ALTER TABLE "jobs" ALTER COLUMN "also_seen_on" SET DEFAULT ARRAY[]::"JobSource_new"[];
ALTER TYPE "JobSource" RENAME TO "JobSource_old";
ALTER TYPE "JobSource_new" RENAME TO "JobSource";
DROP TYPE "JobSource_old";
COMMIT;

-- CreateEnum
CREATE TYPE "SalaryPeriod" AS ENUM ('HOURLY', 'MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "AtsSource" AS ENUM ('GREENHOUSE', 'LEVER', 'ASHBY');

-- CreateEnum
CREATE TYPE "AtsCompanyStatus" AS ENUM ('PENDING_VALIDATION', 'ACTIVE', 'INACTIVE');

-- AlterTable: jobs — job-ingestion.md §3.5/§5.4/§8.4/§8.5 new fields
ALTER TABLE "jobs"
  ADD COLUMN "salary_currency" TEXT,
  ADD COLUMN "salary_period" "SalaryPeriod",
  ADD COLUMN "source_structured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "content_hash" TEXT,
  ADD COLUMN "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "closed_at" TIMESTAMP(3);

CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateTable: ats_companies (job-ingestion.md §3.6, database-schema.md §6.8)
CREATE TABLE "ats_companies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "source" "AtsSource" NOT NULL,
    "company_name" TEXT,
    "status" "AtsCompanyStatus" NOT NULL DEFAULT 'PENDING_VALIDATION',
    "cadence_bucket" INTEGER NOT NULL,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_checked_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),

    CONSTRAINT "ats_companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ats_companies_source_slug_key" ON "ats_companies"("source", "slug");
CREATE INDEX "ats_companies_source_status_cadence_bucket_idx" ON "ats_companies"("source", "status", "cadence_bucket");
