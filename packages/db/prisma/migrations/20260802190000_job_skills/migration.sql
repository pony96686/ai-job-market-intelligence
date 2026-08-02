-- mvp-scope.md §8 Epic 4.15: persist AI Job Parsing's normalized skills
-- (previously computed but never written to the jobs table), see
-- job-ingestion.md §5.1. This is a prerequisite for Epic 10's Skill
-- Intelligence (roadmap.md §1.1).

ALTER TABLE "jobs"
  ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
