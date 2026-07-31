-- Prisma 的 migrate diff 引擎不会跟踪 Unsupported() 字段类型字符串内部的变化，
-- 因此这个 migration 是手写的（schema.prisma 里已经把两处 vector(1536) 改成
-- vector(2048)，但 `prisma migrate dev` 检测不到，需要手动补上实际 DDL）。
--
-- 背景：从 OpenAI text-embedding-3-small（1536 维）切换到 OpenRouter 免费的
-- nvidia/llama-nemotron-embed-vl-1b-v2:free（2048 维）用于本地测试省钱。
--
-- 这两张表目前都没有真实数据（迁移前已确认 job_embeddings 为空、
-- user_profiles.profile_embedding 全部为 NULL），直接 ALTER 类型不会因为
-- 已有行的维度不匹配而失败。若未来这两张表已有真实向量数据，需要先清空
-- 再执行本迁移，或改用重新生成向量的方式回填。

ALTER TABLE "job_embeddings" ALTER COLUMN "embedding" TYPE vector(2048);
ALTER TABLE "user_profiles" ALTER COLUMN "profile_embedding" TYPE vector(2048);
