FROM node:25-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# tsc --noEmit 型检查，作为构建期安全网；apps/worker 的 workspace 依赖
# （packages/db 等）从不产出真实 JS（build 脚本只是 tsc --noEmit），运行时
# 靠 tsx 直接执行 TS 源码——这与本仓库 `pnpm dev` 一直以来的运行方式一致。
RUN pnpm build --filter=@ai-job-market-intelligence/worker

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# pnpm 的 node_modules 是按包隔离的符号链接结构，workspace 里每个包
# （apps/worker、packages/db、packages/shared、packages/ai）都有自己独立的
# node_modules 存放各自依赖的符号链接。分别挑选拷贝极易遗漏，这里直接把
# builder 阶段产出的整个 /app 目录搬过来，保证所有符号链接的相对路径不变。
COPY --from=builder /app ./
EXPOSE 3001
WORKDIR /app/apps/worker
CMD ["node", "--import", "tsx", "src/index.ts"]
