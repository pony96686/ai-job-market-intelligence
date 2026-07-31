-- api-spec.md §4.5 / workers.md §8.4: split career_profiles.parsed_at into
-- independent resume/github parse status + timestamp pairs so a resume
-- re-upload and a GitHub re-link don't clobber each other's parse feedback.

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "career_profiles"
  ADD COLUMN "resume_parse_status" "ParseStatus",
  ADD COLUMN "resume_parsed_at" TIMESTAMP(3),
  ADD COLUMN "github_parse_status" "ParseStatus",
  ADD COLUMN "github_parsed_at" TIMESTAMP(3);

-- Backfill from the old shared parsed_at: a row only ever reflected whichever
-- of resume/github was parsed most recently, so infer which one from what
-- data is actually present. Both may backfill to SUCCESS for a row that has
-- both resume and github data — that's correct, not a conflict.
UPDATE "career_profiles"
  SET "resume_parse_status" = 'SUCCESS', "resume_parsed_at" = "parsed_at"
  WHERE "parsed_at" IS NOT NULL AND ("resume_summary" IS NOT NULL OR array_length("resume_skills", 1) > 0);

UPDATE "career_profiles"
  SET "github_parse_status" = 'SUCCESS', "github_parsed_at" = "parsed_at"
  WHERE "parsed_at" IS NOT NULL AND "github_username" IS NOT NULL;

ALTER TABLE "career_profiles" DROP COLUMN "parsed_at";
