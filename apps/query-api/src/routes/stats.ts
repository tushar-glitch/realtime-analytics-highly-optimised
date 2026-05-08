import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Period } from '@analytics/types'
import { getStatsSummary, getTopPages, getTimeseries } from '../queries/pageviews.js'
import { getTopReferrers } from '../queries/referrers.js'

const querySchema = z.object({
  site_id: z.string().uuid(),
  period: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
})

export async function statsRoutes(app: FastifyInstance) {
  app.get('/api/stats', async (req, reply) => {
    const q = querySchema.safeParse(req.query)
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' })

    const { site_id, period } = q.data
    const cacheKey = `stats:${site_id}:${period}`

    const data = await app.cache.cached(cacheKey, app.cfg.CACHE_TTL_SECONDS, () =>
      getStatsSummary(app.ch, site_id, period as Period),
    )

    return reply.send(data)
  })

  app.get('/api/pages', async (req, reply) => {
    const q = querySchema.safeParse(req.query)
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' })

    const { site_id, period } = q.data
    const cacheKey = `pages:${site_id}:${period}`

    const data = await app.cache.cached(cacheKey, app.cfg.CACHE_TTL_SECONDS, () =>
      getTopPages(app.ch, site_id, period as Period),
    )

    return reply.send(data)
  })

  app.get('/api/timeseries', async (req, reply) => {
    const q = querySchema.safeParse(req.query)
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' })

    const { site_id, period } = q.data
    const cacheKey = `timeseries:${site_id}:${period}`

    const data = await app.cache.cached(cacheKey, app.cfg.CACHE_TTL_SECONDS, () =>
      getTimeseries(app.ch, site_id, period as Period),
    )

    return reply.send(data)
  })

  app.get('/api/referrers', async (req, reply) => {
    const q = querySchema.safeParse(req.query)
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' })

    const { site_id, period } = q.data
    const cacheKey = `referrers:${site_id}:${period}`

    const data = await app.cache.cached(cacheKey, app.cfg.CACHE_TTL_SECONDS, () =>
      getTopReferrers(app.ch, site_id, period as Period),
    )

    return reply.send(data)
  })
}
