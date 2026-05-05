import Fastify from 'fastify'
import type { ClickHouseClient } from '@clickhouse/client'
import { queryApiConfig } from '@analytics/config'
import { createClickHouseClient } from '@analytics/clickhouse'
import { createLogger } from '@analytics/logger'
import { collectDefaultMetrics, register } from 'prom-client'
import { Cache } from './services/cache.js'
import { statsRoutes } from './routes/stats.js'
import { realtimeRoutes } from './routes/realtime.js'

declare module 'fastify' {
  interface FastifyInstance {
    ch: ClickHouseClient
    cache: Cache
    cfg: ReturnType<typeof queryApiConfig>
  }
}

const cfg = queryApiConfig()
const log = createLogger('query-api')

collectDefaultMetrics()

const ch = createClickHouseClient({
  host: cfg.CLICKHOUSE_HOST,
  database: cfg.CLICKHOUSE_DB,
  username: cfg.CLICKHOUSE_USER,
  password: cfg.CLICKHOUSE_PASSWORD,
})

const cache = new Cache(cfg.REDIS_URL)
await cache.connect()

const app = Fastify({ logger: log, trustProxy: true })

app.decorate('ch', ch)
app.decorate('cache', cache)
app.decorate('cfg', cfg)

await app.register(statsRoutes)
await app.register(realtimeRoutes)

app.get('/health', async () => ({ status: 'ok' }))
app.get('/metrics', async (_req, reply) => {
  reply.header('content-type', register.contentType).send(await register.metrics())
})

await app.listen({ port: cfg.QUERY_API_PORT, host: '0.0.0.0' })

process.on('SIGTERM', async () => {
  await app.close()
  await cache.close()
  await ch.close()
  process.exit(0)
})
