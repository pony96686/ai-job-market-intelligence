-- mvp-scope.md §8 Epic 3.8/4.14/5.9 (country-select revision): users pick
-- actual countries (ISO 3166-1 alpha-2), not an abstract region bucket.
-- RegionBucket stays job-side only (Job.eligibleRegions), see
-- database-schema.md's RegionBucket comment.

-- CreateEnum
CREATE TYPE "RegionBucket" AS ENUM ('US', 'EU', 'UK', 'APAC', 'LATAM', 'REMOTE_GLOBAL', 'OTHER');

-- AlterTable: user_profiles
ALTER TABLE "user_profiles"
  ADD COLUMN "preferred_countries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable: jobs
ALTER TABLE "jobs"
  ADD COLUMN "eligible_regions" "RegionBucket"[] NOT NULL DEFAULT ARRAY[]::"RegionBucket"[];
