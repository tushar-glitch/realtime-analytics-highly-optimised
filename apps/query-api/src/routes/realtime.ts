import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const querySchema = z.object({ site_id: z.string().uuid() })

export async function realtimeRoutes(app: FastifyInstance) {
  /**
   * SSE endpoint — streams live visitor count every 10s.
   * Client subscribes once; server pushes updates.
   */
  app.get('/api/live', async (req, reply) => {
    const q = querySchema.safeParse(req.query)
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' })

    const { site_id } = q.data

    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'x-accel-buffering': 'no', // disable Nginx buffering
    })

    const send = async () => {
      const result = await app.ch
        .query({
          query: `
            SELECT uniq(visitor_id) AS active_visitors
            FROM events
            WHERE site_id = {site_id: UUID}
              AND timestamp >= now() - INTERVAL 5 MINUTE
          `,
          query_params: { site_id },
          format: 'JSONEachRow',
        })
        .then((r) => r.json<{ active_visitors: number }[]>())

      const payload = JSON.stringify({ active_visitors: result[0]?.active_visitors ?? 0 })
      reply.raw.write(`data: ${payload}\n\n`)
    }

    await send()
    const interval = setInterval(send, 10_000)

    req.raw.on('close', () => {
      clearInterval(interval)
      reply.raw.end()
    })
  })
}
