-- v2-scope.md §8 Epic 12.1: AI Career Agent core tables, see
-- database-schema.md §11.2.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "daily_brief_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "career_briefs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "brief_date" DATE NOT NULL,
    "summary" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_coach_messages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_coach_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "career_briefs_user_id_brief_date_key" ON "career_briefs"("user_id", "brief_date");

-- CreateIndex
CREATE INDEX "career_coach_messages_user_id_created_at_idx" ON "career_coach_messages"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "career_briefs" ADD CONSTRAINT "career_briefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_coach_messages" ADD CONSTRAINT "career_coach_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
