-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('OPPORTUNITY_DISCOVERY', 'CAREER_COACH');

-- CreateTable
CREATE TABLE "agent_handoffs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "from_agent" "AgentType" NOT NULL,
    "to_agent" "AgentType" NOT NULL,
    "context" JSONB NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumed_at" TIMESTAMP(3),

    CONSTRAINT "agent_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY['career-coach:read', 'career-coach:write']::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_handoffs_user_id_triggered_at_idx" ON "agent_handoffs"("user_id", "triggered_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- AddForeignKey
ALTER TABLE "agent_handoffs" ADD CONSTRAINT "agent_handoffs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
