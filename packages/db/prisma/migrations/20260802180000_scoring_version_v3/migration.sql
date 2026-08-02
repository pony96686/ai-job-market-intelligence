-- mvp-scope.md §8 Epic 5.9/5.10: region/salary preference penalties + the
-- roleScore tag-matching fix are a scoring algorithm change, bumping the
-- default scoring_version from v2 to v3 (see ai-scoring.md §7.1's
-- scoring_version-based rescoring trigger).

ALTER TABLE "job_scores"
  ALTER COLUMN "scoring_version" SET DEFAULT 'v3';
