# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/processor/ ./apps/processor/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @analytics/processor... run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist
COPY --from=builder /app/packages/logger/package.json ./packages/logger/
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/config/package.json ./packages/config/
COPY --from=builder /app/packages/kafka/dist ./packages/kafka/dist
COPY --from=builder /app/packages/kafka/package.json ./packages/kafka/
COPY --from=builder /app/packages/clickhouse/dist ./packages/clickhouse/dist
COPY --from=builder /app/packages/clickhouse/package.json ./packages/clickhouse/
COPY --from=builder /app/apps/processor/dist ./apps/processor/dist
COPY --from=builder /app/apps/processor/package.json ./apps/processor/

RUN pnpm install --frozen-lockfile --prod

EXPOSE 9091
USER node
CMD ["node", "apps/processor/dist/index.js"]
