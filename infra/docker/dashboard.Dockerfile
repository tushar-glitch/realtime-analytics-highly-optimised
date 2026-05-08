FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY sdk/browser/dist/ ./sdk/browser/dist/
COPY apps/dashboard/ ./apps/dashboard/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @analytics/dashboard build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder /app/apps/dashboard/public*      ./public/
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/.next/static     ./.next/static

USER nextjs
EXPOSE 3003
ENV PORT=3003
CMD ["node", "server.js"]
