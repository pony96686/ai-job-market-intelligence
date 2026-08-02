-- v2-scope.md §8 Epic 10.2: Skill Intelligence core tables, see
-- database-schema.md §11.2.

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_trend_snapshots" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "window_days" INTEGER NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "job_count" INTEGER NOT NULL,
    "growth_percent" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_trend_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "skill_trend_snapshots_skill_id_window_days_period_end_key" ON "skill_trend_snapshots"("skill_id", "window_days", "period_end");

-- CreateIndex
CREATE INDEX "skill_trend_snapshots_window_days_period_end_growth_percen_idx" ON "skill_trend_snapshots"("window_days", "period_end", "growth_percent" DESC);

-- AddForeignKey
ALTER TABLE "skill_trend_snapshots" ADD CONSTRAINT "skill_trend_snapshots_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
