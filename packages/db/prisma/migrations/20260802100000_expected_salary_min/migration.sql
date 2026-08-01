-- mvp-scope.md §8 Epic 3.9/5.10: expected minimum annual salary (USD),
-- no currency conversion. null = no salary preference.

-- AlterTable: user_profiles
ALTER TABLE "user_profiles"
  ADD COLUMN "expected_salary_min" INTEGER;
