import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'
import kafkaPlugin from './plugins/kafka.js'
import metricsPlugin from './plugins/metrics.js'
import { collectRoutes } from './routes/collect.js'
import { healthRoutes } from './routes/health.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
      ...(process.env['NODE_ENV'] === 'development' && {
        transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
      }),
    },
    trustProxy: true,
    bodyLimit: 64 * 1024,
  })

  // CORS — allow all origins (tracking script runs on any site)
  app.addHook('onRequest', async (_req, reply) => {
    reply.header('access-control-allow-origin', '*')
    reply.header('access-control-allow-methods', 'GET, POST, OPTIONS')
    reply.header('access-control-allow-headers', 'content-type')
  })

  app.options('*', async (_req, reply) => reply.code(204).send())

  // Rate limit per IP — prevents event spam
  await app.register(rateLimit, {
    max: Number(process.env['RATE_LIMIT_MAX'] ?? 100),
    timeWindow: Number(process.env['RATE_LIMIT_WINDOW_MS'] ?? 60_000),
    keyGenerator: (req) =>
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.ip,
  })

  await app.register(metricsPlugin)
  await app.register(kafkaPlugin)

  await app.register(collectRoutes)
  await app.register(healthRoutes)

  return app
}
